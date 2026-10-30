"""
File upload and parsing for Python, JavaScript, Java, and C++
"""
import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.ast_parser.service import parse_source

router = APIRouter(prefix="/api/files", tags=["File Upload & Parsing"])

SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "javascript",
    ".tsx": "javascript",
    ".java": "java",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".c": "c",
    ".h": "cpp",
    ".hpp": "cpp",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class FileUploadResponse(BaseModel):
    file_name: str
    language: str
    file_size: int
    line_count: int
    char_count: int
    content: str
    parsed: bool
    structure_summary: Optional[str] = None
    error: Optional[str] = None


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a code file (Python, JavaScript, Java, or C++).
    Returns file content and parsed structure.
    
    Supported formats:
      - Python: .py
      - JavaScript/TypeScript: .js, .jsx, .ts, .tsx
      - Java: .java
      - C/C++: .cpp, .cc, .cxx, .c, .h, .hpp
    """
    
    # Validate file extension
    file_name = file.filename or "unknown"
    file_ext = os.path.splitext(file_name)[1].lower()
    
    if file_ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS.keys())}"
        )
    
    # Read file content
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: 5 MB"
            )
        
        text_content = content.decode('utf-8', errors='replace')
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read file: {str(e)}"
        )
    
    language = SUPPORTED_EXTENSIONS[file_ext]
    line_count = len(text_content.splitlines())
    char_count = len(text_content)
    file_size = len(content)
    
    # Try to parse structure
    parsed = False
    structure_summary = None
    
    try:
        if language in ["python", "javascript"]:
            structure = parse_source(text_content, file_name)
            if structure:
                parsed = True
                
                # Build summary
                def count_items(nodes):
                    classes = 0
                    functions = 0
                    for node in nodes:
                        if node.node_type == "class":
                            classes += 1
                        elif node.node_type in ["function", "method"]:
                            functions += 1
                        if node.children:
                            c, f = count_items(node.children)
                            classes += c
                            functions += f
                    return classes, functions
                
                classes, functions = count_items(structure.root_children)
                structure_summary = f"Found {classes} classes and {functions} functions/methods."
        else:
            # Java and C++ would need more complex parsing, but we note support
            structure_summary = f"File uploaded. Full parsing not yet available for {language}."
    except Exception as e:
        structure_summary = f"Parse attempt: {str(e)}"
    
    return FileUploadResponse(
        file_name=file_name,
        language=language,
        file_size=file_size,
        line_count=line_count,
        char_count=char_count,
        content=text_content,
        parsed=parsed,
        structure_summary=structure_summary,
        error=None
    )


@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats."""
    return {
        "formats": SUPPORTED_EXTENSIONS,
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "description": "Upload code files in Python, JavaScript, Java, or C/C++ for analysis"
    }
