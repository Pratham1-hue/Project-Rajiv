import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    """Users table for Tech Netra developer accounts."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    audio_preferences = relationship(
        "AudioPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    custom_voice_commands = relationship(
        "CustomVoiceCommand",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    codebase_states = relationship(
        "CodebaseState",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class AudioPreference(Base):
    """
    User audio and screen-reader preferences:
    TTS engine, speech rate, Web Audio pitch cues, and verbosity.
    """
    __tablename__ = "audio_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    tts_engine = Column(String(50), default="web_speech", nullable=False)  # 'web_speech', 'whisper', 'eleven_labs'
    speech_rate = Column(Float, default=1.05, nullable=False)
    pitch_cues = Column(Boolean, default=True, nullable=False)  # Web Audio API pitch modulation
    verbosity_level = Column(String(20), default="concise", nullable=False)  # 'concise', 'normal', 'detailed'
    auto_read_errors = Column(Boolean, default=True, nullable=False)

    # Relationship
    user = relationship("User", back_populates="audio_preferences")


class CustomVoiceCommand(Base):
    """
    Custom spoken voice phrases and user-defined voice macros.
    e.g. 'jump to main' -> action_type: 'ast_jump', action_payload: {'target': 'main', 'type': 'function'}
    """
    __tablename__ = "custom_voice_commands"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    spoken_phrase = Column(String(255), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)  # 'ast_jump', 'debugger', 'codegen', 'macro'
    action_payload = Column(JSON, nullable=False, default=dict)

    # Relationship
    user = relationship("User", back_populates="custom_voice_commands")


class CodebaseState(Base):
    """
    Stores developer's active cursor, project context, active AST node,
    and intercepted stack traces for state restoration and multi-agent coordination.
    """
    __tablename__ = "codebase_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(100), default="default_project", nullable=False, index=True)
    active_file = Column(String(500), nullable=False, default="sample_code.py")
    active_line = Column(Integer, default=1, nullable=False)
    active_ast_node = Column(String(255), nullable=True)  # Name or identifier of enclosing AST node
    last_error_trace = Column(JSON, nullable=True)  # Serialized stack trace payload
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False
    )

    # Relationship
    user = relationship("User", back_populates="codebase_states")

