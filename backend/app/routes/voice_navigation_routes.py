"""
Voice navigation: parse commands like "take me to function xyz" or "go to line 75"
"""
import re
from typing import Optional, Tuple
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.ast_parser.service import parse_source
from app.ast_parser.models import JumpResponse

router = APIRouter(prefix="/api/voice-nav", tags=["Voice Navigation Commands"])


class VoiceNavRequest(BaseModel):
    command: str = Field(..., min_length=1, description="Voice command like 'take me to function foo'")
    code: str = Field(default="", description="Current code content")
    file_name: str = Field(default="sample_code.py", description="File name for language detection")


class VoiceNavResponse(BaseModel):
    target_line: int
    target_name: str
    context: str
    spoken_response: str
    error: Optional[str] = None


def extract_target(command: str) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    """
    Parse voice commands and extract target.
    Examples:
      - "take me to class User" -> ("class", "User", None)
      - "go to function login" -> ("function", "login", None)
      - "jump to line 75" -> (None, None, 75)
      - "navigate to method process" -> ("method", "process", None)
    """
    command_lower = command.lower().strip()
    
    # Line number extraction: "line 75" or "line number 75"
    line_match = re.search(r'(?:line|go to line)\s*(?:number\s*)?(\d+)', command_lower)
    if line_match:
        return None, None, int(line_match.group(1))
    
    # Class extraction: "class ClassName"
    class_match = re.search(r'\b(?:class|go to class|take me to class)\s+([A-Za-z_]\w*)', command_lower)
    if class_match:
        return "class", class_match.group(1), None
    
    # Function extraction: "function funcName"
    func_match = re.search(r'\b(?:function|func|go to function|take me to function|call)\s+([A-Za-z_]\w*)', command_lower)
    if func_match:
        return "function", func_match.group(1), None
    
    # Method extraction: "method methodName"
    method_match = re.search(r'\b(?:method|go to method|take me to method)\s+([A-Za-z_]\w*)', command_lower)
    if method_match:
        return "method", method_match.group(1), None
    
    return None, None, None


@router.post("/navigate", response_model=VoiceNavResponse)
async def navigate_to_target(request: VoiceNavRequest):
    """
    Navigate to a class, function, method, or line number via voice command.
    
    Examples:
      - "take me to class User"
      - "go to function login"
      - "navigate to line 75"
      - "jump to method process"
    """
    command = request.command
    code = request.code
    file_name = request.file_name
    
    if not code.strip():
        return VoiceNavResponse(
            target_line=1,
            target_name="",
            context="No code loaded",
            spoken_response="No code is currently loaded. Please load a file first.",
            error="No code"
        )
    
    target_type, target_name, line_number = extract_target(command)
    
    # If targeting a line number directly
    if line_number is not None:
        lines = code.splitlines()
        if 1 <= line_number <= len(lines):
            target_line = lines[line_number - 1]
            return VoiceNavResponse(
                target_line=line_number,
                target_name=f"Line {line_number}",
                context=target_line[:100],
                spoken_response=f"Jumped to line {line_number}. Code: {target_line[:50]}.",
                error=None
            )
        else:
            return VoiceNavResponse(
                target_line=1,
                target_name="",
                context="",
                spoken_response=f"Line {line_number} does not exist. File has {len(lines)} lines.",
                error=f"Line {line_number} out of range"
            )
    
    # If targeting a class, function, or method
    if target_type and target_name:
        try:
            structure = parse_source(code, file_name)
            if not structure:
                return VoiceNavResponse(
                    target_line=1,
                    target_name="",
                    context="",
                    spoken_response="Could not parse the code.",
                    error="Parse error"
                )
            
            # Search for matching node
            def find_node(nodes, name, node_type):
                for node in nodes:
                    if (node.name and node.name.lower() == name.lower() and 
                        (target_type == "method" or node.node_type in ["class", "function", "method"])):
                        if target_type == "class" and node.node_type == "class":
                            return node
                        elif target_type in ["function", "method"] and node.node_type in ["function", "method"]:
                            return node
                    # Recurse into children
                    if node.children:
                        result = find_node(node.children, name, node_type)
                        if result:
                            return result
                return None
            
            target_node = find_node(structure.root_children, target_name, target_type)
            
            if target_node:
                context_lines = code.splitlines()
                start = max(0, target_node.start_line - 1)
                end = min(len(context_lines), target_node.end_line or target_node.start_line)
                context = "\n".join(context_lines[start:end])[:200]
                
                spoken = (
                    f"Found {target_type} {target_name} at line {target_node.start_line}. "
                    f"This {target_type} spans from line {target_node.start_line} to {target_node.end_line}."
                )
                
                return VoiceNavResponse(
                    target_line=target_node.start_line,
                    target_name=target_name,
                    context=context,
                    spoken_response=spoken,
                    error=None
                )
            else:
                return VoiceNavResponse(
                    target_line=1,
                    target_name="",
                    context="",
                    spoken_response=f"Could not find {target_type} named {target_name}.",
                    error=f"{target_type} not found"
                )
        except Exception as e:
            return VoiceNavResponse(
                target_line=1,
                target_name="",
                context="",
                spoken_response=f"Error navigating: {str(e)}",
                error=str(e)
            )
    
    return VoiceNavResponse(
        target_line=1,
        target_name="",
        context="",
        spoken_response="I did not understand the navigation command. Try 'go to function name' or 'line 42'.",
        error="Command not parsed"
    )
