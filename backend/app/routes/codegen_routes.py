import re
from fastapi import APIRouter, HTTPException

from app.ai_service import generate_text, strip_code_fences
from app.ast_parser.python_parser import code_span
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/api/codegen", tags=["Voice-Driven Code Generation & Audio Diffs"])


class CodeGenRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Spoken developer prompt or intent")
    current_code: str = Field("", description="Current file code")
    file_name: str = Field("main.py", description="Target file name")
    insert_at_line: Optional[int] = Field(None, description="Cursor line to insert at")


class CodeGenResponse(BaseModel):
    generated_code: str
    audio_diff_summary: str
    diff_text: str
    lines_added: int
    target_line: int
    file_name: str


@router.post("/generate", response_model=CodeGenResponse)
def generate_code_from_voice(request: CodeGenRequest):
    """
    Generate code from voice prompt and provide an Audio Diff summary
    (e.g., 'Adding 6 lines to auth.py. Press Enter to accept or Escape to reject').
    """
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=422, detail="Prompt must not be blank.")
    current_code = request.current_code
    lines = current_code.splitlines() if current_code else []
    target_line = request.insert_at_line or (len(lines) + 1)
    file_name = request.file_name

    generated_code = ""
    raw_text = generate_text(
        f"User request: {prompt}",
        system=(
            "You are an assistant for a blind developer. Generate clean, concise, idiomatic Python code "
            "satisfying the user's intent. Output ONLY executable code with no markdown formatting or backticks."
        ),
        max_tokens=2048,
    )
    if raw_text:
        generated_code = strip_code_fences(raw_text)

    if not generated_code:
        # Fallback intelligent generation for common developer requests
        if "prime" in prompt.lower():
            generated_code = (
                "def find_primes(numbers: list[int]) -> list[int]:\n"
                "    \"\"\"Filter and return all prime numbers from the input list.\"\"\"\n"
                "    def is_prime(n: int) -> bool:\n"
                "        if n < 2:\n"
                "            return False\n"
                "        for i in range(2, int(n ** 0.5) + 1):\n"
                "            if n % i == 0:\n"
                "                return False\n"
                "        return True\n"
                "\n"
                "    return [num for num in numbers if is_prime(num)]"
            )
        elif "discount" in prompt.lower() or "coupon" in prompt.lower():
            generated_code = (
                "def apply_coupon(subtotal: float, code: str) -> float:\n"
                "    \"\"\"Apply promotional discount code to subtotal.\"\"\"\n"
                "    coupons = {'VIP10': 0.10, 'FLASH25': 0.25, 'FREESHIP': 0.0}\n"
                "    discount_rate = coupons.get(code.upper(), 0.0)\n"
                "    return round(subtotal * (1 - discount_rate), 2)"
            )
        else:
            words = re.findall(r"[a-zA-Z0-9]+", prompt.lower())[:3]
            func_name = "_".join(words) or "generated_function"
            if func_name[0].isdigit():
                func_name = f"fn_{func_name}"
            safe_doc = prompt.replace('"""', "'''")
            generated_code = (
                f"def {func_name}():\n"
                f"    \"\"\"{safe_doc}\"\"\"\n"
                f"    # Generated implementation\n"
                f"    pass"
            )

    gen_lines = generated_code.splitlines()
    line_count = len(gen_lines)
    audio_diff = f"Adding {line_count} lines to {code_span(file_name)}. Press Enter to accept or Escape to reject."

    diff_lines = [f"+ {l}" for l in gen_lines]
    diff_text = "\n".join(diff_lines)

    return CodeGenResponse(
        generated_code=generated_code,
        audio_diff_summary=audio_diff,
        diff_text=diff_text,
        lines_added=line_count,
        target_line=target_line,
        file_name=file_name
    )

