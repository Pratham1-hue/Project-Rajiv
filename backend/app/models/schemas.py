import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# ==========================================
# 1. USER SCHEMAS
# ==========================================
class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ==========================================
# 2. AUDIO PREFERENCES SCHEMAS
# ==========================================
class AudioPreferenceBase(BaseModel):
    tts_engine: str = Field("web_speech", description="TTS Engine: web_speech, whisper, eleven_labs")
    speech_rate: float = Field(1.05, ge=0.5, le=2.5, description="Speech rate multiplier")
    pitch_cues: bool = Field(True, description="Enable Web Audio pitch modulation for indentation")
    verbosity_level: str = Field("concise", description="concise, normal, or detailed")
    auto_read_errors: bool = Field(True, description="Automatically speak intercepted errors via TTS")


class AudioPreferenceCreate(AudioPreferenceBase):
    pass


class AudioPreferenceUpdate(BaseModel):
    tts_engine: Optional[str] = None
    speech_rate: Optional[float] = None
    pitch_cues: Optional[bool] = None
    verbosity_level: Optional[str] = None
    auto_read_errors: Optional[bool] = None


class AudioPreferenceRead(AudioPreferenceBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ==========================================
# 3. CUSTOM VOICE COMMAND SCHEMAS
# ==========================================
class CustomVoiceCommandBase(BaseModel):
    spoken_phrase: str = Field(..., description="Spoken trigger phrase (e.g. 'jump to main')")
    action_type: str = Field(..., description="Action category: ast_jump, debugger, codegen, macro")
    action_payload: Dict[str, Any] = Field(default_factory=dict, description="JSON configuration payload")


class CustomVoiceCommandCreate(CustomVoiceCommandBase):
    pass


class CustomVoiceCommandRead(CustomVoiceCommandBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# ==========================================
# 4. CODEBASE STATE SCHEMAS
# ==========================================
class CodebaseStateBase(BaseModel):
    project_id: str = "default_project"
    active_file: str = "sample_code.py"
    active_line: int = 1
    active_ast_node: Optional[str] = None
    last_error_trace: Optional[Dict[str, Any]] = None


class CodebaseStateCreate(CodebaseStateBase):
    pass


class CodebaseStateUpdate(BaseModel):
    project_id: Optional[str] = None
    active_file: Optional[str] = None
    active_line: Optional[int] = None
    active_ast_node: Optional[str] = None
    last_error_trace: Optional[Dict[str, Any]] = None


class CodebaseStateRead(CodebaseStateBase):
    id: int
    user_id: int
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# ==========================================
# 5. AST PARSING & SYMBOL MAP SCHEMAS
# ==========================================
class RawCodeParseRequest(BaseModel):
    code: str = Field(..., description="Raw Python code string to parse into AST")
    file_path: Optional[str] = Field("interactive.py", description="Virtual or disk file path")


class FunctionMapItem(BaseModel):
    name: str
    type: str  # 'function' or 'method'
    start_line: int
    end_line: int
    depth: int
    parent_scope: str
    parameters: List[str]
    docstring: Optional[str] = None
    return_type: Optional[str] = None
    audio_pitch_frequency: float
    summary: str


class ClassMapItem(BaseModel):
    name: str
    start_line: int
    end_line: int
    depth: int
    parent_scope: str
    docstring: Optional[str] = None
    audio_pitch_frequency: float
    methods: List[FunctionMapItem] = Field(default_factory=list)
    summary: str


class ASTCodeMapResponse(BaseModel):
    language: str = "python"
    total_lines: int
    total_classes: int
    total_functions: int
    classes: List[ClassMapItem]
    functions: List[FunctionMapItem]
    quick_audio_summary: str

