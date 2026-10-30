from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ASTNode(BaseModel):
    id: str = Field(..., description="Unique identifier for the AST node")
    node_type: str = Field(..., description="Type of node: function, class, method, loop, conditional, import, etc.")
    name: Optional[str] = Field(None, description="Identifier name of the symbol if applicable")
    start_line: int = Field(..., description="1-indexed line number where node begins")
    start_col: int = Field(0, description="0-indexed column where node begins")
    end_line: int = Field(..., description="1-indexed line number where node ends")
    end_col: int = Field(0, description="0-indexed column where node ends")
    depth: int = Field(0, description="Indentation / structural nesting depth level (0, 1, 2, ...)")
    parent_scope: str = Field("Top-level", description="Audio announcement of parent scope hierarchy")
    parameters: List[str] = Field(default_factory=list, description="Function / method argument names")
    return_type: Optional[str] = Field(None, description="Return type annotation if present")
    docstring: Optional[str] = Field(None, description="First-line docstring summary if available")
    summary: str = Field(..., description="Screen-reader and voice TTS friendly summary")
    audio_pitch_frequency: float = Field(220.0, description="Web Audio API recommended tone frequency in Hz based on depth")
    code_snippet: Optional[str] = Field(None, description="Brief code excerpt")
    children: List["ASTNode"] = Field(default_factory=list, description="Sub-nodes in AST hierarchy")


ASTNode.model_rebuild()


class CodeStructure(BaseModel):
    file_path: Optional[str] = None
    language: str
    total_lines: int
    classes: List[ASTNode] = Field(default_factory=list)
    functions: List[ASTNode] = Field(default_factory=list)
    methods: List[ASTNode] = Field(default_factory=list)
    imports: List[ASTNode] = Field(default_factory=list)
    loops: List[ASTNode] = Field(default_factory=list)
    conditionals: List[ASTNode] = Field(default_factory=list)
    error_handlers: List[ASTNode] = Field(default_factory=list)
    all_symbols: List[ASTNode] = Field(default_factory=list)


class QueryRequest(BaseModel):
    code: Optional[str] = None
    file_path: Optional[str] = None
    symbol_name: Optional[str] = None
    symbol_type: Optional[str] = None


class JumpRequest(BaseModel):
    code: Optional[str] = None
    file_path: Optional[str] = None
    current_line: int
    target_type: str  # 'function', 'class', 'loop', 'conditional', 'any'
    direction: str = "next"  # 'next' or 'prev'


class NodeAtLineRequest(BaseModel):
    code: Optional[str] = None
    file_path: Optional[str] = None
    line: int
    col: int = 0


class JumpResponse(BaseModel):
    found: bool
    target_node: Optional[ASTNode] = None
    speech_announcement: str
    pitch_frequency: float
    indentation_depth: int
    parent_scope: str


class SearchVoiceCommandRequest(BaseModel):
    voice_transcript: str
    code: Optional[str] = None
    file_path: Optional[str] = None
    current_line: int = 1

