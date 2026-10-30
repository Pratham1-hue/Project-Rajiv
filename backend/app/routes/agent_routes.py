"""
Voice agent: turns one spoken sentence into an ordered, multi-step plan.

Read-only steps (git status, diff, log) execute immediately and are spoken back.
Steps that change code, files, or history (refactors, save, commit) are prepared
and returned as a single pending action that the user confirms with Enter.
"""
import difflib
import re
from typing import List, Literal, Optional, Tuple

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app import git_service
from app.ai_service import generate_json
from app.ast_parser.models import JumpResponse
from app.ast_parser.service import parse_source, resolve_voice_intent
from app.refactor.python_refactor import RefactorError, extract_function, make_diff, rename_symbol

router = APIRouter(prefix="/api/agent", tags=["Voice Agent: Refactoring & Git"])

StepStatus = Literal["done", "ready", "failed", "skipped"]


class AgentCommandRequest(BaseModel):
    transcript: str = Field(..., min_length=1)
    code: str = ""
    file_name: str = "sample_code.py"
    cursor_line: int = 1
    selection_start: Optional[int] = None
    selection_end: Optional[int] = None


class AgentStep(BaseModel):
    action: str
    label: str
    status: StepStatus
    detail: str = ""


class PendingAction(BaseModel):
    summary: str
    diff: str = ""
    updated_code: Optional[str] = None
    save: bool = False
    commit_message: Optional[str] = None
    focus_line: Optional[int] = None


class AgentCommandResponse(BaseModel):
    understood: bool
    steps: List[AgentStep]
    spoken: str
    navigation: Optional[JumpResponse] = None
    pending: Optional[PendingAction] = None


class AgentExecuteRequest(BaseModel):
    file_name: str = "sample_code.py"
    code: str
    save: bool = False
    commit_message: Optional[str] = None


class AgentExecuteResponse(BaseModel):
    success: bool
    steps: List[AgentStep]
    spoken: str


EXTRACT_RE = re.compile(
    r"\bextract\b(?P<what>.*?)\b(?:into|as)\s+(?:an?\s+)?(?:new\s+)?(?:function|method)?\s*(?:named|called)?\s*(?P<name>.+)$"
)
RENAME_RE = re.compile(
    r"\brename\s+(?:the\s+)?(?:variable|function|class|method|parameter)?\s*(?P<old>.+?)\s+(?:to|as|into)\s+(?P<new>.+)$"
)
COMMIT_RE = re.compile(
    r"\bcommit\b(?:\s+(?:all|everything|it|changes|the changes|my changes))?(?:\s+with)?(?:\s+(?:a|the)\s+)?(?:\s*message)?[\s:,]*(?P<msg>.*)$"
)
RANGE_RE = re.compile(r"(\d+)\s*(?:to|through|thru|-|and)\s*(\d+)")
SINGLE_LINE_RE = re.compile(r"\bline\s+(\d+)\b")


def split_clauses(text: str) -> List[str]:
    """Split on 'and' / 'then', but keep everything after 'commit' as the commit message."""
    commit_match = re.search(r"\bcommit\b", text)
    head, tail = (text[: commit_match.start()], text[commit_match.start():]) if commit_match else (text, "")
    clauses = [c.strip(" ,.") for c in re.split(r"\s*,?\s*\b(?:and then|then|and also|and)\b\s*", head)]
    clauses = [c for c in clauses if c]
    if tail:
        clauses.append(tail.strip())
    return clauses


def classify(clause: str) -> str:
    c = clause.lower()
    if re.search(r"\bextract\b", c):
        return "extract"
    if re.search(r"\brename\b", c):
        return "rename"
    if re.search(r"\bcommit\b", c):
        return "commit"
    if re.search(r"\bstatus\b", c):
        return "status"
    if re.search(r"\b(diff|what (?:has )?changed|show (?:the |my )?changes)\b", c):
        return "diff"
    if re.search(r"\b(log|history|recent commits|last commits?)\b", c):
        return "log"
    if re.search(r"\bsave\b", c):
        return "save"
    return "unknown"


def resolve_identifier(spoken: str, code: str) -> str:
    """Map a dictated name ("verify token") onto an identifier that exists in the code."""
    spoken = spoken.strip(" .,'\"")
    if re.fullmatch(r"[A-Za-z_]\w*", spoken):
        return spoken
    key = re.sub(r"[\s_]+", "", spoken).lower()
    for ident in sorted(set(re.findall(r"[A-Za-z_]\w*", code)), key=len):
        if ident.replace("_", "").lower() == key:
            return ident
    return re.sub(r"\s+", "_", spoken)


def resolve_range(what: str, req: AgentCommandRequest, use_selection: bool) -> Tuple[int, int, str]:
    m = RANGE_RE.search(what)
    if m:
        return int(m.group(1)), int(m.group(2)), f"lines {m.group(1)} to {m.group(2)}"
    m = SINGLE_LINE_RE.search(what)
    if m:
        return int(m.group(1)), int(m.group(1)), f"line {m.group(1)}"
    if use_selection and req.selection_start and req.selection_end:
        lo, hi = sorted((req.selection_start, req.selection_end))
        return lo, hi, f"selected lines {lo} to {hi}"
    return req.cursor_line, req.cursor_line, f"the statement at line {req.cursor_line}"


def rewrite_with_claude(transcript: str) -> Optional[str]:
    """Optional: let Claude normalise free-form speech into the supported command grammar."""
    prompt = (
        "Rewrite a developer's spoken request into commands joined by ' and '. Allowed commands: "
        "'extract lines A to B into function NAME', 'extract current lines into function NAME', "
        "'rename OLD to NEW', 'git status', 'show diff', 'show log', 'save file', 'commit with message MSG'. "
        "If the request is about moving through code, return it unchanged. "
        'Respond as JSON: {"command": "..."}.\n\nRequest: ' + transcript
    )
    data = generate_json(
        prompt,
        system="You normalize spoken developer requests into a small command grammar.",
        max_tokens=256,
    )
    command = data.get("command") if data else None
    return command if isinstance(command, str) and command.strip() else None


def unsaved_note(req: AgentCommandRequest) -> str:
    try:
        on_disk = git_service.read_file(req.file_name)
    except git_service.GitError:
        return ""
    if on_disk == req.code:
        return ""
    changed = sum(
        1 for line in difflib.unified_diff(on_disk.splitlines(), req.code.splitlines(), lineterm="", n=0)
        if line[:1] in "+-" and not line.startswith(("+++", "---"))
    )
    return f" The editor also has {changed} unsaved line change{'s' if changed != 1 else ''} in {req.file_name}."


@router.post("/command", response_model=AgentCommandResponse)
def agent_command(req: AgentCommandRequest):
    transcript = req.transcript.strip()
    clauses = split_clauses(transcript)
    kinds = [classify(c) for c in clauses]

    if all(k == "unknown" for k in kinds):
        rewritten = rewrite_with_claude(transcript)
        if rewritten and rewritten.strip().lower() != transcript.lower():
            clauses = split_clauses(rewritten)
            kinds = [classify(c) for c in clauses]

    if all(k == "unknown" for k in kinds):
        structure = parse_source(code=req.code or None, file_path=None if req.code else None, language=None) if req.code else None
        if structure is None:
            return AgentCommandResponse(
                understood=False, steps=[], spoken="Sorry, I did not understand that command."
            )
        nav = resolve_voice_intent(structure, transcript, req.cursor_line)
        return AgentCommandResponse(
            understood=nav.found,
            steps=[AgentStep(action="navigate", label="Navigate", status="done", detail=nav.speech_announcement)],
            spoken=nav.speech_announcement,
            navigation=nav,
        )

    working = req.code
    steps: List[AgentStep] = []
    save = False
    commit_message: Optional[str] = None
    focus_line: Optional[int] = None
    refactor_summaries: List[str] = []
    selection_used = False
    halted = False

    for clause, kind in zip(clauses, kinds):
        if halted:
            steps.append(AgentStep(action=kind, label=clause, status="skipped", detail="Skipped because an earlier step failed."))
            continue
        try:
            if kind == "extract":
                m = EXTRACT_RE.search(clause.lower())
                if not m:
                    raise RefactorError("Say: extract lines 10 to 14 into function named my_helper.")
                name_raw = clause[m.start("name"): m.end("name")]
                start, end, where = resolve_range(m.group("what"), req, use_selection=not selection_used)
                selection_used = True
                result = extract_function(working, start, end, name_raw, req.file_name)
                working = result.updated_code
                focus_line = result.focus_line
                refactor_summaries.append(f"extract {result.details['name']}")
                steps.append(AgentStep(action="extract", label=f"Extract {where}", status="ready", detail=result.summary))

            elif kind == "rename":
                m = RENAME_RE.search(clause)
                if not m:
                    raise RefactorError("Say: rename old_name to new_name.")
                old = resolve_identifier(m.group("old"), working)
                result = rename_symbol(working, old, m.group("new"), req.cursor_line, req.file_name)
                working = result.updated_code
                focus_line = result.focus_line
                refactor_summaries.append(f"rename {old} to {result.details['new']}")
                steps.append(AgentStep(action="rename", label=f"Rename {old}", status="ready", detail=result.summary))

            elif kind == "status":
                s = git_service.status()
                steps.append(AgentStep(action="status", label="Git status", status="done", detail=s["spoken"] + unsaved_note(req)))

            elif kind == "diff":
                d = git_service.diff_summary()
                steps.append(AgentStep(action="diff", label="Git diff", status="done", detail=d["spoken"] + unsaved_note(req)))

            elif kind == "log":
                lg = git_service.log()
                steps.append(AgentStep(action="log", label="Git log", status="done", detail=lg["spoken"]))

            elif kind == "save":
                save = True
                steps.append(AgentStep(action="save", label=f"Save {req.file_name}", status="ready", detail=f"Write the editor contents to {req.file_name}."))

            elif kind == "commit":
                m = COMMIT_RE.search(clause)
                message = (m.group("msg") if m else "").strip(" .\"'")
                if not message:
                    message = ("Refactor: " + ", ".join(refactor_summaries)) if refactor_summaries else f"Update {req.file_name}"
                message = message[0].upper() + message[1:]
                commit_message = message
                steps.append(AgentStep(action="commit", label="Commit", status="ready", detail=f'Save {req.file_name} and commit with message "{message}".'))

            else:
                steps.append(AgentStep(action="unknown", label=clause, status="skipped", detail=f"I did not understand: {clause}."))

        except (RefactorError, git_service.GitError) as exc:
            steps.append(AgentStep(action=kind, label=clause, status="failed", detail=str(exc)))
            halted = True

    code_changed = working != req.code
    pending: Optional[PendingAction] = None
    if not halted and (code_changed or save or commit_message):
        actions = [s.detail for s in steps if s.status == "ready"]
        pending = PendingAction(
            summary=" ".join(actions),
            diff=make_diff(req.code, working, req.file_name) if code_changed else "",
            updated_code=working if code_changed else None,
            save=save or commit_message is not None,
            commit_message=commit_message,
            focus_line=focus_line,
        )

    spoken_parts = [f"Plan with {len(steps)} step{'s' if len(steps) != 1 else ''}."]
    for i, step in enumerate(steps, 1):
        state = {"done": "done", "ready": "ready", "failed": "failed", "skipped": "skipped"}[step.status]
        spoken_parts.append(f"Step {i}, {state}: {step.detail}")
    if pending:
        spoken_parts.append("Press Enter to confirm, or Escape to cancel.")
    elif halted:
        spoken_parts.append("Nothing was changed.")

    return AgentCommandResponse(understood=True, steps=steps, spoken=" ".join(spoken_parts), pending=pending)


@router.post("/execute", response_model=AgentExecuteResponse)
def agent_execute(req: AgentExecuteRequest):
    """Run the confirmed, state-changing part of a plan: save and/or commit."""
    steps: List[AgentStep] = []
    try:
        if req.commit_message:
            result = git_service.commit(req.commit_message, {req.file_name: req.code})
            steps.append(AgentStep(action="save", label=f"Save {req.file_name}", status="done", detail=f"Saved {req.file_name}."))
            steps.append(AgentStep(action="commit", label="Commit", status="done", detail=result["spoken"]))
        elif req.save:
            git_service.ensure_workspace()
            git_service.write_file(req.file_name, req.code)
            steps.append(AgentStep(action="save", label=f"Save {req.file_name}", status="done", detail=f"Saved {req.file_name}."))
        return AgentExecuteResponse(success=True, steps=steps, spoken=" ".join(s.detail for s in steps) or "Nothing to do.")
    except git_service.GitError as exc:
        steps.append(AgentStep(action="execute", label="Execute", status="failed", detail=str(exc)))
        return AgentExecuteResponse(success=False, steps=steps, spoken=str(exc))
