import os
import re
from typing import Optional, List, Dict
from app.ast_parser.models import ASTNode, CodeStructure, JumpResponse
from app.ast_parser.python_parser import parse_python_code, get_audio_pitch
from app.ast_parser.js_parser import parse_js_code


def detect_language(file_path: Optional[str] = None, code_sample: str = "") -> str:
    """Detect language from file extension or content hints."""
    if file_path:
        ext = os.path.splitext(file_path)[1].lower()
        if ext in (".py", ".pyw"):
            return "python"
        if ext in (".js", ".jsx", ".ts", ".tsx", ".mjs"):
            return "javascript"

    # Fallback content heuristics
    if "def " in code_sample or "class " in code_sample and ":" in code_sample:
        return "python"
    if "const " in code_sample or "function " in code_sample or "let " in code_sample:
        return "javascript"

    return "python"


def parse_source(code: Optional[str] = None, file_path: Optional[str] = None, language: Optional[str] = None) -> CodeStructure:
    """Main entrypoint to parse source code or a file from disk."""
    if file_path and not code:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                code = f.read()
        else:
            raise FileNotFoundError(f"Source file not found at: {file_path}")

    if code is None:
        raise ValueError("Neither code nor valid file_path was provided.")

    lang = language or detect_language(file_path, code)

    if lang == "python":
        return parse_python_code(code, file_path)
    elif lang in ("javascript", "typescript"):
        return parse_js_code(code, file_path)
    else:
        # Default fallback to python parser
        return parse_python_code(code, file_path)


def query_symbols(
    structure: CodeStructure,
    name: Optional[str] = None,
    symbol_type: Optional[str] = None
) -> List[ASTNode]:
    """Query classes, functions, loops, or conditionals by name or type."""
    candidates = structure.all_symbols

    if symbol_type:
        sym_type = symbol_type.lower()
        if sym_type == "function":
            candidates = structure.functions + structure.methods
        elif sym_type == "class":
            candidates = structure.classes
        elif sym_type == "loop":
            candidates = structure.loops
        elif sym_type == "conditional":
            candidates = structure.conditionals
        elif sym_type == "import":
            candidates = structure.imports
        else:
            candidates = [s for s in candidates if s.node_type == sym_type]

    if name:
        search_term = name.strip().lower()
        # Exact match priority, then substring match
        exact_matches = [s for s in candidates if s.name and s.name.lower() == search_term]
        if exact_matches:
            return exact_matches
        candidates = [s for s in candidates if s.name and search_term in s.name.lower()]

    return candidates


def find_jump_target(
    structure: CodeStructure,
    current_line: int,
    target_type: str,
    direction: str = "next"
) -> JumpResponse:
    """
    Find structural jump target (function, class, loop, conditional)
    relative to current cursor line position.
    """
    t_type = target_type.lower()
    if t_type in ("function", "method", "fn"):
        pool = structure.functions + structure.methods
    elif t_type in ("class", "cls"):
        pool = structure.classes
    elif t_type in ("loop", "loops"):
        pool = structure.loops
    elif t_type in ("conditional", "cond", "if"):
        pool = structure.conditionals
    elif t_type in ("error_handler", "try", "catch"):
        pool = structure.error_handlers
    else:
        pool = structure.all_symbols

    # Sort candidates
    pool = sorted(pool, key=lambda x: (x.start_line, x.start_col))

    if direction == "next":
        valid = [n for n in pool if n.start_line > current_line]
        target = valid[0] if valid else (pool[0] if pool else None)
    else:  # prev
        valid = [n for n in pool if n.start_line < current_line]
        target = valid[-1] if valid else (pool[-1] if pool else None)

    if not target:
        return JumpResponse(
            found=False,
            target_node=None,
            speech_announcement=f"No {target_type} found in code.",
            pitch_frequency=220.0,
            indentation_depth=0,
            parent_scope="Top-level module"
        )

    # Format announcement
    speech = f"Jumped to {target.summary}. {target.parent_scope}."
    return JumpResponse(
        found=True,
        target_node=target,
        speech_announcement=speech,
        pitch_frequency=target.audio_pitch_frequency,
        indentation_depth=target.depth,
        parent_scope=target.parent_scope
    )


def get_node_at_line(structure: CodeStructure, line: int, col: int = 0) -> JumpResponse:
    """
    Find the most deeply nested AST node containing the cursor line and column.
    Provides real-time pitch tone and parent scope announcement.
    """
    enclosing: List[ASTNode] = []

    def check_node(node: ASTNode):
        if node.start_line <= line <= node.end_line:
            enclosing.append(node)
            for child in node.children:
                check_node(child)

    for sym in structure.all_symbols:
        if sym.start_line <= line <= sym.end_line:
            enclosing.append(sym)
            for child in sym.children:
                check_node(child)

    if not enclosing:
        return JumpResponse(
            found=False,
            target_node=None,
            speech_announcement="Top-level module",
            pitch_frequency=220.0,
            indentation_depth=0,
            parent_scope="Top-level module"
        )

    # Pick node with greatest depth (most specific child)
    best_node = max(enclosing, key=lambda n: (n.depth, n.start_line))

    return JumpResponse(
        found=True,
        target_node=best_node,
        speech_announcement=f"{best_node.summary}. {best_node.parent_scope}.",
        pitch_frequency=best_node.audio_pitch_frequency,
        indentation_depth=best_node.depth,
        parent_scope=best_node.parent_scope
    )


def resolve_voice_intent(structure: CodeStructure, transcript: str, current_line: int = 1) -> JumpResponse:
    """
    Natural voice intent parser mapping spoken developer requests to AST nodes.
    Examples:
    - 'Move to calculate_total function'
    - 'Skip to next if statement'
    - 'Go to where verify_token is imported'
    - 'Next loop'
    - 'Jump to class PaymentGateway'
    """
    text = transcript.strip().lower()

    # Check for next/prev keywords
    direction = "prev" if any(w in text for w in ("previous", "prev", "back", "before")) else "next"

    # Check for specific structural kinds
    if "next function" in text or "next method" in text:
        return find_jump_target(structure, current_line, "function", "next")
    if "previous function" in text or "prev function" in text:
        return find_jump_target(structure, current_line, "function", "prev")
    if "next class" in text:
        return find_jump_target(structure, current_line, "class", "next")
    if "previous class" in text or "prev class" in text:
        return find_jump_target(structure, current_line, "class", "prev")
    if "next loop" in text:
        return find_jump_target(structure, current_line, "loop", "next")
    if "next if" in text or "next conditional" in text or "skip to next if" in text:
        return find_jump_target(structure, current_line, "conditional", "next")

    # Match: "move to <name> function", "go to <name>", "jump to <name>", "find <name>"
    patterns = [
        r"(?:move to|go to|jump to|find|look for|show me)\s+(?:the\s+)?([a-zA-Z0-9_]+)\s+(?:function|method|class|loop)?",
        r"(?:move to|go to|jump to|find)\s+(?:function|class|method)\s+([a-zA-Z0-9_]+)",
        r"(?:where is|where)\s+([a-zA-Z0-9_]+)\s+(?:imported|defined)?",
    ]

    target_name = None
    for pattern in patterns:
        m = re.search(pattern, text)
        if m:
            target_name = m.group(1)
            break

    # If no pattern matched, check if any symbol name is in the utterance
    if not target_name:
        for sym in structure.all_symbols:
            if sym.name and sym.name.lower() in text:
                target_name = sym.name
                break

    if target_name:
        matches = query_symbols(structure, name=target_name)
        if matches:
            target = matches[0]
            return JumpResponse(
                found=True,
                target_node=target,
                speech_announcement=f"Found {target.summary}. {target.parent_scope}.",
                pitch_frequency=target.audio_pitch_frequency,
                indentation_depth=target.depth,
                parent_scope=target.parent_scope
            )

    # Fallback to default next function
    return find_jump_target(structure, current_line, "function", direction)

