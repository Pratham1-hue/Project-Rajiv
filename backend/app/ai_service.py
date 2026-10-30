"""Shared Anthropic Claude client for AI-backed features.

Set ANTHROPIC_API_KEY to enable Claude-backed code generation, debugging,
vision audits, and voice-command normalization. Without a key, each feature
falls back to its built-in rule-based behavior.

ANTHROPIC_MODEL defaults to the current Sonnet model and can be overridden
without a code change if your account uses a different model ID.
"""
import base64
import json
import logging
import os
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)

DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5"


def api_key() -> Optional[str]:
    return os.environ.get("ANTHROPIC_API_KEY") or None


def model_name() -> str:
    return os.environ.get("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL)


def is_configured() -> bool:
    return bool(api_key())


def _client():
    key = api_key()
    if not key:
        return None
    from anthropic import Anthropic

    return Anthropic(api_key=key)


def _text_from_message(message: Any) -> str:
    parts = []
    for block in getattr(message, "content", []) or []:
        text = getattr(block, "text", None)
        if text:
            parts.append(text)
    return "\n".join(parts).strip()


def _create_message(
    content: Any,
    *,
    system: Optional[str] = None,
    max_tokens: int = 1024,
) -> Optional[str]:
    client = _client()
    if client is None:
        return None

    kwargs: dict[str, Any] = {
        "model": model_name(),
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": content}],
    }
    if system:
        kwargs["system"] = system

    try:
        message = client.messages.create(**kwargs)
    except Exception as exc:  # Never break a request because the AI provider failed.
        logger.warning("Anthropic request failed (model=%s): %s", model_name(), exc)
        return None
    return _text_from_message(message) or None


def generate_text(
    prompt: str,
    *,
    system: Optional[str] = None,
    max_tokens: int = 1024,
) -> Optional[str]:
    """Generate plain text with Claude. Returns None when unavailable."""
    return _create_message(prompt, system=system, max_tokens=max_tokens)


def extract_json(text: str) -> Optional[dict[str, Any]]:
    """Parse a JSON object from Claude output, tolerating markdown fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    candidates = [cleaned]
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start != -1 and end > start:
        candidates.append(cleaned[start : end + 1])

    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(data, dict):
            return data
    return None


def generate_json(
    prompt: str,
    *,
    system: Optional[str] = None,
    max_tokens: int = 1024,
) -> Optional[dict[str, Any]]:
    """Generate a JSON object with Claude. Returns None when unavailable."""
    json_system = (
        (system + "\n\n" if system else "")
        + "Return only a valid JSON object. Do not wrap it in markdown or add commentary."
    )
    text = generate_text(prompt, system=json_system, max_tokens=max_tokens)
    return extract_json(text) if text else None


def generate_json_with_image(
    prompt: str,
    image_bytes: bytes,
    *,
    media_type: str = "image/png",
    system: Optional[str] = None,
    max_tokens: int = 1024,
) -> Optional[dict[str, Any]]:
    """Send an image plus a JSON instruction to Claude. Returns None when unavailable."""
    if not image_bytes:
        return None

    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    content = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": image_b64,
            },
        },
        {"type": "text", "text": prompt},
    ]
    json_system = (
        (system + "\n\n" if system else "")
        + "Return only a valid JSON object. Do not wrap it in markdown or add commentary."
    )
    text = _create_message(content, system=json_system, max_tokens=max_tokens)
    return extract_json(text) if text else None


def strip_code_fences(text: str) -> str:
    """Remove markdown fences from generated code."""
    cleaned = text.strip()
    if not cleaned.startswith("```"):
        return cleaned
    lines = cleaned.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()
