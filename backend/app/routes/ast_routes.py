import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.ast_parser.models import (
    CodeStructure,
    ASTNode,
    QueryRequest,
    JumpRequest,
    NodeAtLineRequest,
    JumpResponse,
    SearchVoiceCommandRequest
)
from app.models.schemas import (
    RawCodeParseRequest,
    ASTCodeMapResponse,
    ClassMapItem,
    FunctionMapItem
)
from app.ast_parser.service import (
    parse_source,
    query_symbols,
    find_jump_target,
    get_node_at_line,
    resolve_voice_intent
)

router = APIRouter(prefix="/api/ast", tags=["AST Navigation & Parsing"])

SAMPLE_FILE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "sample_code.py")
)


@router.get("/sample")
def get_sample_code():
    """Retrieve the sample Python file code and parsed AST structure."""
    if not os.path.exists(SAMPLE_FILE_PATH):
        raise HTTPException(status_code=404, detail="Sample code file not found.")

    with open(SAMPLE_FILE_PATH, "r", encoding="utf-8") as f:
        code = f.read()

    structure = parse_source(code=code, file_path=SAMPLE_FILE_PATH, language="python")
    return {
        "file_name": "sample_code.py",
        "file_path": SAMPLE_FILE_PATH,
        "code": code,
        "structure": structure
    }


@router.post("/parse", response_model=CodeStructure)
def parse_code(request: QueryRequest):
    """Parse arbitrary code or a specified file into structured AST."""
    try:
        structure = parse_source(code=request.code, file_path=request.file_path)
        return structure
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/symbols", response_model=List[ASTNode])
def get_symbols(request: QueryRequest):
    """Query classes, functions, or other symbols by name or type."""
    try:
        structure = parse_source(code=request.code, file_path=request.file_path or SAMPLE_FILE_PATH)
        return query_symbols(structure, name=request.symbol_name, symbol_type=request.symbol_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/jump", response_model=JumpResponse)
def jump_ast(request: JumpRequest):
    """
    Perform structural jump (Alt+F for next function, Alt+C for next class,
    Alt+L for next loop, or prev/next direction).
    """
    try:
        structure = parse_source(code=request.code, file_path=request.file_path or SAMPLE_FILE_PATH)
        return find_jump_target(
            structure=structure,
            current_line=request.current_line,
            target_type=request.target_type,
            direction=request.direction
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/node-at-line", response_model=JumpResponse)
def inspect_node_at_line(request: NodeAtLineRequest):
    """
    Get active enclosing node, scope, and indentation pitch tone frequency
    for a given cursor line number.
    """
    try:
        structure = parse_source(code=request.code, file_path=request.file_path or SAMPLE_FILE_PATH)
        return get_node_at_line(structure=structure, line=request.line, col=request.col)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/voice-command", response_model=JumpResponse)
def voice_command(request: SearchVoiceCommandRequest):
    """
    Process spoken voice command (e.g. 'Move to calculate_total function')
    and return target AST node + speech announcement.
    """
    try:
        structure = parse_source(code=request.code, file_path=request.file_path or SAMPLE_FILE_PATH)
        return resolve_voice_intent(
            structure=structure,
            transcript=request.voice_transcript,
            current_line=request.current_line
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/parse-map", response_model=ASTCodeMapResponse)
def parse_raw_code_map(request: RawCodeParseRequest):
    """
    Accept a raw Python code string and return a structured JSON map
    of its classes, methods, and functions with scopes and audio pitch cues.
    """
    try:
        structure = parse_source(code=request.code, file_path=request.file_path, language="python")

        # Map methods to their enclosing classes
        class_items: List[ClassMapItem] = []
        for cls in structure.classes:
            # Find methods defined inside this class
            class_methods = [
                FunctionMapItem(
                    name=m.name or "anonymous_method",
                    type="method",
                    start_line=m.start_line,
                    end_line=m.end_line,
                    depth=m.depth,
                    parent_scope=m.parent_scope,
                    parameters=m.parameters,
                    docstring=m.docstring,
                    return_type=m.return_type,
                    audio_pitch_frequency=m.audio_pitch_frequency,
                    summary=m.summary
                )
                for m in structure.methods
                if m.start_line > cls.start_line and m.end_line <= cls.end_line
            ]

            class_items.append(
                ClassMapItem(
                    name=cls.name or "AnonymousClass",
                    start_line=cls.start_line,
                    end_line=cls.end_line,
                    depth=cls.depth,
                    parent_scope=cls.parent_scope,
                    docstring=cls.docstring,
                    audio_pitch_frequency=cls.audio_pitch_frequency,
                    methods=class_methods,
                    summary=cls.summary
                )
            )

        # Map top-level standalone functions
        func_items: List[FunctionMapItem] = [
            FunctionMapItem(
                name=f.name or "anonymous_function",
                type="function",
                start_line=f.start_line,
                end_line=f.end_line,
                depth=f.depth,
                parent_scope=f.parent_scope,
                parameters=f.parameters,
                docstring=f.docstring,
                return_type=f.return_type,
                audio_pitch_frequency=f.audio_pitch_frequency,
                summary=f.summary
            )
            for f in structure.functions
        ]

        summary = (
            f"Parsed {structure.total_lines} lines of Python code: "
            f"Found {len(class_items)} classes and {len(func_items)} standalone functions."
        )

        return ASTCodeMapResponse(
            language="python",
            total_lines=structure.total_lines,
            total_classes=len(class_items),
            total_functions=len(func_items),
            classes=class_items,
            functions=func_items,
            quick_audio_summary=summary
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


