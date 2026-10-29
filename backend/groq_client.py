"""Small Groq chat client. Scanner and chatbot both call this."""
import json
import os
import urllib.error
import urllib.request

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# Vision-capable model so a product label photo and a text chat use one provider.
GROQ_MODEL = "qwen/qwen3.8-27b"


def groq_chat(messages, temperature=0.4, max_tokens=800):
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        raise RuntimeError("Groq API key is not configured on the server.")

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

    return payload["choices"][0]["message"]["content"]
