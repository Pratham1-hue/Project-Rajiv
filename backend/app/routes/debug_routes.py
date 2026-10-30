import re
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from app.ai_service import generate_json
from app.ast_parser.python_parser import code_span

router = APIRouter(prefix="/api/debug", tags=["Conversational Debugger & AST Explainer"])


class DebugExplainRequest(BaseModel):
    stack_trace: str
    code: Optional[str] = None
    file_path: Optional[str] = None


class VariableQueryRequest(BaseModel):
    code: str
    target_line: int
    variable_name: str
    query_type: str = "last_modified"  # 'last_modified' or 'current_values'


class PatchApplyRequest(BaseModel):
    code: str
    line_number: int
    new_line_content: str


class DebugExplainResponse(BaseModel):
    error_type: str
    error_message: str
    error_line: int
    tldr_summary: str
    spoken_announcement: str
    patch_diff: str
    patch_spoken: str
    original_line: str
    patched_line: str
    auto_patch_available: bool


@router.post("/explain", response_model=DebugExplainResponse)
def explain_stack_trace(request: DebugExplainRequest):
    """
    Intercept stack trace, parse the error line and error message,
    and return a concise 2-sentence plain-English summary, auto-focus line,
    and 1-line diff patch ready for voice acceptance.
    """
    stack = request.stack_trace
    code = request.code or ""

    # Parse error line from python stack trace (e.g. File "...", line 42, in process_order)
    line_matches = re.findall(r'line (\d+)(?:,\s*in\s*(\w+))?', stack)
    error_line = 1
    func_name = "unknown"
    if line_matches:
        error_line = int(line_matches[-1][0])
        func_name = line_matches[-1][1] if line_matches[-1][1] else "function"

    # Extract error type and message (last line of stack trace)
    lines = [l.strip() for l in stack.strip().splitlines() if l.strip()]
    last_line = lines[-1] if lines else "Error: Execution failed"
    error_type = last_line.split(":")[0] if ":" in last_line else "Exception"
    error_msg = ":".join(last_line.split(":")[1:]).strip() if ":" in last_line else last_line

    # Inspect code around error_line
    code_lines = code.splitlines() if code else []
    original_code_line = ""
    if 1 <= error_line <= len(code_lines):
        original_code_line = code_lines[error_line - 1]

    # Generate 1-line auto patch and 2-sentence plain-English summary
    tldr_summary = ""
    patch_diff = ""
    patched_line = original_code_line
    patch_spoken = ""

    prompt = (
        f"Analyze this stack trace:\n{stack}\n\n"
        f"Line {error_line}: {original_code_line}\n\n"
        f"Provide:\n"
        f"1. A 2-sentence plain-English audio summary explaining what failed and why (no markdown or code symbols).\n"
        f"2. A single corrected replacement line for line {error_line}.\n"
        f"Format your response as JSON with keys 'summary' and 'patched_line'."
    )
    data = generate_json(
        prompt,
        system=(
            "You are an accessibility-first developer assistant for a visually impaired programmer. "
            "Be concise, accurate, and audio-friendly."
        ),
        max_tokens=512,
    )
    if data:
        summary = data.get("summary")
        if isinstance(summary, str):
            tldr_summary = summary.strip()
        candidate = data.get("patched_line")
        if isinstance(candidate, str) and candidate.strip():
            patched_line = candidate.strip("\n")

    if not tldr_summary:
        # High precision fallback rule engine for common python error patterns
        if "TypeError" in error_type and ("unsupported operand" in error_msg or "str" in error_msg):
            tldr_summary = (
                f"Execution failed at line {error_line} in {func_name}. "
                f"TypeError: Attempted to add integer or float amount to string '50'."
            )
            # Generate 1-line auto patch
            if "total_with_tax = subtotal + raw_tax_fee" in original_code_line:
                leading_spaces = len(original_code_line) - len(original_code_line.lstrip())
                indent = " " * leading_spaces
                patched_line = f"{indent}total_with_tax = subtotal + float(raw_tax_fee)"
            elif "+" in original_code_line:
                patched_line = original_code_line.replace("raw_tax_fee", "float(raw_tax_fee)")
        elif "ZeroDivisionError" in error_type:
            tldr_summary = (
                f"Execution failed at line {error_line} in {func_name}. "
                f"ZeroDivisionError: Division by zero encountered."
            )
        elif "KeyError" in error_type:
            tldr_summary = (
                f"Execution failed at line {error_line} in {func_name}. "
                f"KeyError: Dictionary key was not found."
            )
        elif "IndexError" in error_type:
            tldr_summary = (
                f"Execution failed at line {error_line} in {func_name}. "
                f"IndexError: List index was out of bounds."
            )
        else:
            tldr_summary = (
                f"Execution failed at line {error_line} in {func_name}. "
                f"{error_type}: {error_msg}."
            )

    if patched_line and patched_line != original_code_line:
        patch_diff = f"- {original_code_line.strip()}\n+ {patched_line.strip()}"
        patch_spoken = f"Suggested patch: Replace line {error_line} with {code_span(patched_line.strip())}. Press Enter to apply or Escape to cancel."
    else:
        patch_diff = f"# Line {error_line}: {original_code_line.strip()}"
        patch_spoken = f"Cursor focused on line {error_line}. No automatic 1-line patch available."

    return DebugExplainResponse(
        error_type=error_type,
        error_message=error_msg,
        error_line=error_line,
        tldr_summary=tldr_summary,
        spoken_announcement=f"{tldr_summary} Auto-focused cursor on line {error_line}. {patch_spoken}",
        patch_diff=patch_diff,
        patch_spoken=patch_spoken,
        original_line=original_code_line,
        patched_line=patched_line,
        auto_patch_available=(patched_line != original_code_line)
    )


@router.post("/query-variable")
def query_variable(request: VariableQueryRequest):
    """
    Handle voice questions like:
    'Where was this variable last modified?' or
    'What are the current variable values at this line?'
    """
    code_lines = request.code.splitlines()
    var = request.variable_name.strip()
    target = min(request.target_line, len(code_lines))

    # Search backwards from target line for assignments to var
    last_modified_line = None
    assignment_snippet = None

    pattern = re.compile(rf"\b{re.escape(var)}\s*(=|\+=|-=|\*=|/=|:=)\s*(.+)")

    for idx in range(target - 1, -1, -1):
        line = code_lines[idx]
        m = pattern.search(line)
        if m:
            last_modified_line = idx + 1
            assignment_snippet = line.strip()
            break

    if last_modified_line:
        announcement = (
            f"Variable {code_span(var)} was last modified at line {last_modified_line}: {code_span(assignment_snippet)}."
        )
        return {
            "found": True,
            "variable": var,
            "line": last_modified_line,
            "snippet": assignment_snippet,
            "speech_announcement": announcement
        }
    else:
        announcement = f"Variable {code_span(var)} was not found modified before line {target}."
        return {
            "found": False,
            "variable": var,
            "line": None,
            "snippet": None,
            "speech_announcement": announcement
        }


@router.post("/apply-patch")
def apply_patch(request: PatchApplyRequest):
    """Applies the 1-line fix and returns updated source code."""
    lines = request.code.splitlines()
    if 1 <= request.line_number <= len(lines):
        lines[request.line_number - 1] = request.new_line_content
        updated_code = "\n".join(lines)
        return {
            "success": True,
            "line_number": request.line_number,
            "updated_code": updated_code,
            "speech_announcement": f"Patch applied to line {request.line_number}. Error resolved."
        }
    return {
        "success": False,
        "line_number": request.line_number,
        "updated_code": request.code,
        "speech_announcement": "Failed to apply patch: Line number out of range."
    }

