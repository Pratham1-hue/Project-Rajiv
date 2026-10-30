from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.db_models import User, AudioPreference, CustomVoiceCommand, CodebaseState
from app.models.schemas import (
    UserCreate,
    UserRead,
    AudioPreferenceCreate,
    AudioPreferenceUpdate,
    AudioPreferenceRead,
    CustomVoiceCommandCreate,
    CustomVoiceCommandRead,
    CodebaseStateCreate,
    CodebaseStateUpdate,
    CodebaseStateRead,
)

router = APIRouter(prefix="/api/users", tags=["User Preferences & State"])


# ==========================================
# 1. USER ACCOUNTS
# ==========================================
@router.post("/", response_model=UserRead)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Create a new developer profile and initialize default audio preferences."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        return existing

    new_user = User(email=user_in.email)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize default Audio Preferences
    default_prefs = AudioPreference(
        user_id=new_user.id,
        tts_engine="web_speech",
        speech_rate=1.05,
        pitch_cues=True,
        verbosity_level="concise",
        auto_read_errors=True
    )
    db.add(default_prefs)

    # Initialize default Codebase State
    default_state = CodebaseState(
        user_id=new_user.id,
        project_id="default_project",
        active_file="sample_code.py",
        active_line=1,
        active_ast_node="module"
    )
    db.add(default_state)
    db.commit()

    return new_user


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Retrieve user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ==========================================
# 2. AUDIO PREFERENCES
# ==========================================
@router.get("/{user_id}/preferences", response_model=AudioPreferenceRead)
def get_preferences(user_id: int, db: Session = Depends(get_db)):
    """Retrieve user's audio and screen-reader preferences."""
    prefs = db.query(AudioPreference).filter(AudioPreference.user_id == user_id).first()
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return prefs


@router.put("/{user_id}/preferences", response_model=AudioPreferenceRead)
def update_preferences(
    user_id: int,
    prefs_in: AudioPreferenceUpdate,
    db: Session = Depends(get_db)
):
    """Update speech rate, pitch cues, verbosity, and TTS engine."""
    prefs = db.query(AudioPreference).filter(AudioPreference.user_id == user_id).first()
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")

    for field, val in prefs_in.model_dump(exclude_unset=True).items():
        setattr(prefs, field, val)

    db.commit()
    db.refresh(prefs)
    return prefs


# ==========================================
# 3. CUSTOM VOICE COMMANDS
# ==========================================
@router.post("/{user_id}/commands", response_model=CustomVoiceCommandRead)
def add_voice_command(
    user_id: int,
    cmd_in: CustomVoiceCommandCreate,
    db: Session = Depends(get_db)
):
    """Register custom voice macro or spoken trigger phrase."""
    cmd = CustomVoiceCommand(
        user_id=user_id,
        spoken_phrase=cmd_in.spoken_phrase,
        action_type=cmd_in.action_type,
        action_payload=cmd_in.action_payload
    )
    db.add(cmd)
    db.commit()
    db.refresh(cmd)
    return cmd


@router.get("/{user_id}/commands", response_model=List[CustomVoiceCommandRead])
def list_voice_commands(user_id: int, db: Session = Depends(get_db)):
    """List all custom voice commands configured for the user."""
    return db.query(CustomVoiceCommand).filter(CustomVoiceCommand.user_id == user_id).all()


# ==========================================
# 4. CODEBASE STATE PERSISTENCE
# ==========================================
@router.get("/{user_id}/state", response_model=CodebaseStateRead)
def get_codebase_state(user_id: int, db: Session = Depends(get_db)):
    """Get the active file, cursor position, and last error trace."""
    state = db.query(CodebaseState).filter(CodebaseState.user_id == user_id).first()
    if not state:
        raise HTTPException(status_code=404, detail="Codebase state not found")
    return state


@router.put("/{user_id}/state", response_model=CodebaseStateRead)
def update_codebase_state(
    user_id: int,
    state_in: CodebaseStateUpdate,
    db: Session = Depends(get_db)
):
    """Persist active cursor line, active AST node, or intercepted stack trace."""
    state = db.query(CodebaseState).filter(CodebaseState.user_id == user_id).first()
    if not state:
        state = CodebaseState(user_id=user_id)
        db.add(state)

    for field, val in state_in.model_dump(exclude_unset=True).items():
        setattr(state, field, val)

    db.commit()
    db.refresh(state)
    return state

