"""Small Groq chat client. Scanner and chatbot both call this."""
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

# Always prefer backend/.env for Groq so the scanner/chatbot work even when the
# process environment was started without the key (or with an empty placeholder).
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH, override=True)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# Vision-capable model so a product label photo and a text chat use one provider.
GROQ_MODEL = "qwen/qwen3.8-27b"


def _groq_api_key():
    """Read the key at call time so a late .env edit is picked up without a full reboot."""
    load_dotenv(_ENV_PATH, override=True)
    key = (os.environ.get("GROQ_API_KEY") or "").strip().strip('"').strip("'")
    return key


def groq_chat(messages, temperature=0.4, max_tokens=800):
    key = _groq_api_key()
    if not key:
        raise RuntimeError(
            "Groq API key is not configured on the server. "
            "Add GROQ_API_KEY to backend/.env and restart the Django server."
        )

    body = json.dumps({
        "model": os.environ.get("GROQ_MODEL", GROQ_MODEL),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }).encode()
    request = urllib.request.Request(
        GROQ_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": "TrueTone/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:400]
        raise RuntimeError(f"Groq error {exc.code}: {detail}") from exc

    message = (payload.get("choices") or [{}])[0].get("message") or {}
    content = message.get("content")
    if content is None or not str(content).strip():
        # Some Groq models put the answer in reasoning / tool fields; surface a clear error.
        raise RuntimeError("Groq returned an empty response. Try again or switch GROQ_MODEL.")
    return str(content)