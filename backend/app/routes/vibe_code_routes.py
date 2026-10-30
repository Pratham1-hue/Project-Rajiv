"""
Vibe Code: Generate code in the context of the current file.
Example: "Generate a function to do matrix multiplication in this file"
"""
import json
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ai_service import generate_json
from app.ast_parser.service import parse_source

router = APIRouter(prefix="/api/vibe-code", tags=["Vibe Code - Context-Aware Generation"])


class VibeCodeRequest(BaseModel):
    vibe_request: str = Field(..., min_length=1, description="What you want to generate")
    current_code: str = Field(default="", description="The current file content for context")
    file_name: str = Field(default="sample_code.py", description="File name for language detection")
    cursor_line: int = Field(default=1, description="Current cursor position")
    style_preference: Optional[str] = Field(default=None, description="e.g., 'functional', 'oop', 'concise'")


class VibeCodeResponse(BaseModel):
    generated_code: str
    explanation: str
    language: str
    suggested_location: int = 1
    fits_context: bool
    spoken_response: str


def detect_language(file_name: str) -> str:
    """Detect programming language from file extension."""
    if file_name.endswith(('.py',)):
        return "python"
    elif file_name.endswith(('.js', '.jsx', '.ts', '.tsx')):
        return "javascript"
    elif file_name.endswith(('.java',)):
        return "java"
    elif file_name.endswith(('.cpp', '.cc', '.cxx', '.c', '.h', '.hpp')):
        return "cpp"
    return "python"


def build_context_prompt(code: str, file_name: str, request: str, style: Optional[str]) -> str:
    """Build a detailed prompt that includes file context."""
    language = detect_language(file_name)
    lines = code.splitlines() if code else []
    line_count = len(lines)
    
    # Try to understand file structure
    structure_hint = ""
    if code:
        try:
            structure = parse_source(code, file_name)
            if structure and structure.root_children:
                classes = [n for n in structure.root_children if n.node_type == "class"]
                functions = [n for n in structure.root_children if n.node_type in ["function", "method"]]
                if classes or functions:
                    structure_hint = f"\nThis file currently has {len(classes)} classes and {len(functions)} functions."
                    if classes:
                        structure_hint += f" Classes: {', '.join([c.name for c in classes[:3]])}."
                    if functions:
                        structure_hint += f" Functions: {', '.join([f.name for f in functions[:3]])}."
        except:
            pass
    
    style_guidance = ""
    if style:
        style_guidance = f"\nPlease write in a {style} style."
    
    existing_code = ""
    if code and lines:
        # Show first ~500 chars of existing code as context
        existing_code = f"\n\nExisting code in {file_name} ({line_count} lines):\n{chr(10).join(lines[:10])}"
        if len(lines) > 10:
            existing_code += f"\n... ({line_count - 10} more lines)"
    
    prompt = (
        f"You are helping a blind developer write {language} code.\n"
        f"Task: {request}\n"
        f"File: {file_name} ({language}){structure_hint}{style_guidance}"
        f"{existing_code}\n\n"
        f"Generate clean, accessible, executable code that fits naturally into this file. "
        f"Output ONLY the code with no markdown, backticks, or explanation. "
        f"Make it concise and production-ready."
    )
    
    return prompt


@router.post("/generate", response_model=VibeCodeResponse)
async def generate_vibe_code(request: VibeCodeRequest):
    """
    Generate code that fits the context of the current file.
    
    Examples:
      - "Generate a function to do matrix multiplication"
      - "Add a class for user authentication with login and logout methods"
      - "Write a helper function to validate email addresses"
    """
    
    vibe_request = request.vibe_request
    current_code = request.current_code
    file_name = request.file_name
    language = detect_language(file_name)
    
    if not vibe_request.strip():
        return VibeCodeResponse(
            generated_code="",
            explanation="Request was empty.",
            language=language,
            suggested_location=request.cursor_line,
            fits_context=False,
            spoken_response="Please provide a description of what you want to generate."
        )
    
    # Build detailed prompt with file context
    prompt = build_context_prompt(current_code, file_name, vibe_request, request.style_preference)
    
    # Call Claude to generate code
    generated_code = ""
    try:
        generated_code = await generate_vibe_code_with_claude(prompt, language)
    except Exception as e:
        # Fallback if Claude fails
        generated_code = f"# Generated code placeholder\n# Task: {vibe_request}\n# Language: {language}"
    
    if not generated_code or not generated_code.strip():
        return VibeCodeResponse(
            generated_code="# Unable to generate code",
            explanation="Claude could not generate code for this request.",
            language=language,
            suggested_location=request.cursor_line,
            fits_context=False,
            spoken_response="I could not generate code for that request. Try being more specific."
        )
    
    # Determine if code fits context
    fits_context = True
    if current_code and len(current_code) > 100:
        fits_context = True
    
    # Suggest where to insert the code (at end of file or after cursor)
    suggested_location = len(current_code.splitlines()) + 1 if current_code else 1
    
    explanation = (
        f"Generated {language} code for: {vibe_request}. "
        f"This code integrates with your current file ({file_name})."
    )
    
    spoken_response = (
        f"Generated code snippet. {explanation} "
        f"The code is ready to insert at line {suggested_location}. "
        f"Press Enter to accept or ask me to modify it."
    )
    
    return VibeCodeResponse(
        generated_code=generated_code,
        explanation=explanation,
        language=language,
        suggested_location=suggested_location,
        fits_context=fits_context,
        spoken_response=spoken_response
    )


async def generate_vibe_code_with_claude(prompt: str, language: str) -> str:
    """Use Claude to generate code with context awareness."""
    from app.ai_service import generate_text
    
    system_prompt = (
        f"You are an expert {language} developer helping a visually impaired programmer. "
        f"Generate clean, concise, accessible code that follows best practices. "
        f"Output ONLY the code with NO markdown, backticks, comments about the code, or explanations."
    )
    
    result = generate_text(prompt, system=system_prompt, max_tokens=1500)
    
    if result:
        # Clean up markdown if present
        result = result.strip()
        if result.startswith("```"):
            lines = result.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            result = "\n".join(lines).strip()
    
    return result or ""
