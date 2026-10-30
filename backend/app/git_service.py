"""
Git operations for voice commands, sandboxed to a dedicated workspace repository.

The editor's file lives in WORKSPACE_DIR (default: backend/workspace), which is its
own git repo. Voice commands never touch any other repository on disk.
"""
import os
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parent.parent
SEED_FILE = BACKEND_DIR / "sample_code.py"

STATUS_WORDS = {
    "M": "modified",
    "A": "added",
    "D": "deleted",
    "R": "renamed",
    "C": "copied",
    "U": "conflicted",
    "?": "untracked",
}


class GitError(Exception):
    """Speakable git failure."""


def workspace_dir() -> Path:
    return Path(os.environ.get("TECH_NETRA_WORKSPACE", BACKEND_DIR / "workspace")).resolve()


def git_available() -> bool:
    return shutil.which("git") is not None


def _run(args: List[str], check: bool = True) -> subprocess.CompletedProcess:
    if not git_available():
        raise GitError("Git is not installed or not on the system path.")
    result = subprocess.run(
        ["git", "-C", str(workspace_dir()), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=20,
    )
    if check and result.returncode != 0:
        message = (result.stderr or result.stdout).strip().splitlines()
        raise GitError(f"Git {args[0]} failed: {message[-1] if message else 'unknown error'}")
    return result


def _identity_args() -> List[str]:
    """Use the user's configured identity; fall back only if none is set."""
    email = _run(["config", "user.email"], check=False).stdout.strip()
    name = _run(["config", "user.name"], check=False).stdout.strip()
    args: List[str] = []
    if not email:
        args += ["-c", "user.email=tech-netra@localhost"]
    if not name:
        args += ["-c", "user.name=Tech Netra"]
    return args


def ensure_workspace() -> Path:
    """Create the workspace (seeded with the sample file) and initialise its repo once."""
    ws = workspace_dir()
    ws.mkdir(parents=True, exist_ok=True)
    seed_target = ws / SEED_FILE.name
    if not seed_target.exists() and SEED_FILE.exists():
        shutil.copyfile(SEED_FILE, seed_target)

    if git_available() and not (ws / ".git").exists():
        _run(["init"])
        _run(["checkout", "-b", "main"], check=False)
        _run(["add", "-A"])
        _run([*_identity_args(), "commit", "-m", "Initial workspace from Tech Netra"], check=False)
    return ws


def resolve_path(rel_path: str) -> Path:
    ws = workspace_dir()
    target = (ws / rel_path).resolve()
    if not target.is_relative_to(ws) or target == ws or ".git" in target.relative_to(ws).parts:
        raise GitError(f"{rel_path} is outside the Tech Netra workspace.")
    return target


def read_file(rel_path: str) -> str:
    target = resolve_path(rel_path)
    if not target.exists():
        raise GitError(f"{rel_path} does not exist in the workspace.")
    return target.read_text(encoding="utf-8")


def write_file(rel_path: str, content: str) -> Path:
    target = resolve_path(rel_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    # newline="" keeps the editor's line endings exactly as given
    with open(target, "w", encoding="utf-8", newline="") as f:
        f.write(content)
    return target


def status() -> Dict[str, object]:
    ensure_workspace()
    out = _run(["status", "--porcelain=v1", "--branch"]).stdout.splitlines()
    branch = "unknown"
    changes: List[Dict[str, str]] = []
    for line in out:
        if line.startswith("## "):
            branch = line[3:].split("...")[0].replace("No commits yet on ", "")
            continue
        code, path = line[:2], line[3:]
        key = code.strip()[:1] or "?"
        changes.append({"path": path, "status": STATUS_WORDS.get(key, "changed")})

    if changes:
        parts = [f"{c['path']} {c['status']}" for c in changes[:5]]
        more = f" and {len(changes) - 5} more" if len(changes) > 5 else ""
        spoken = f"On branch {branch}. {len(changes)} file{'s' if len(changes) != 1 else ''} changed: {', '.join(parts)}{more}."
    else:
        spoken = f"On branch {branch}. Working tree is clean."
    return {"branch": branch, "changes": changes, "spoken": spoken}


def diff_summary() -> Dict[str, object]:
    ensure_workspace()
    rows = _run(["diff", "--numstat", "HEAD"], check=False).stdout.splitlines()
    files = []
    for row in rows:
        parts = row.split("\t")
        if len(parts) == 3:
            added, removed, path = parts
            files.append({"path": path, "added": int(added) if added.isdigit() else 0, "removed": int(removed) if removed.isdigit() else 0})
    if files:
        spoken = " ".join(f"{f['path']}: {f['added']} lines added, {f['removed']} removed." for f in files)
    else:
        spoken = "No changes compared to the last commit."
    return {"files": files, "spoken": spoken}


def log(limit: int = 5) -> Dict[str, object]:
    ensure_workspace()
    result = _run(["log", f"-n{limit}", "--pretty=format:%h%x09%s%x09%ar"], check=False)
    commits = []
    for row in result.stdout.splitlines():
        parts = row.split("\t")
        if len(parts) == 3:
            commits.append({"hash": parts[0], "message": parts[1], "when": parts[2]})
    if commits:
        spoken = "Recent commits: " + "; ".join(f"{c['message']}, {c['when']}" for c in commits) + "."
    else:
        spoken = "There are no commits yet."
    return {"commits": commits, "spoken": spoken}


def commit(message: str, files: Optional[Dict[str, str]] = None) -> Dict[str, object]:
    """Write the given files, stage them, and commit. Returns the new short hash."""
    ensure_workspace()
    message = message.strip()
    if not message:
        raise GitError("A commit message is required.")
    for rel_path, content in (files or {}).items():
        write_file(rel_path, content)
        _run(["add", "--", str(resolve_path(rel_path).relative_to(workspace_dir()))])

    staged = _run(["diff", "--cached", "--quiet"], check=False)
    if staged.returncode == 0:
        return {"committed": False, "hash": None, "spoken": "Nothing to commit. The file matches the last commit."}

    _run([*_identity_args(), "commit", "-m", message])
    short_hash = _run(["rev-parse", "--short", "HEAD"]).stdout.strip()
    return {"committed": True, "hash": short_hash, "spoken": f"Committed {short_hash} with message: {message}."}
