"""Minimal Python stdio MCP-like server for TaskMasterWeb.

The server reads JSON lines from stdin and writes JSON lines to stdout.
It supports a minimal set of actions: `ping` (health check) and `complete`
which will either call OpenAI (if OPENAI_API_KEY is set and openai installed)
or use a simple fallback.
"""
import sys
import json
import os
from typing import Any, Dict


def send(obj: Dict[str, Any]):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def handle_ping(msg: Dict[str, Any]):
    return {"id": msg.get("id"), "result": {"pong": True}, "error": None}


def has_openai() -> bool:
    try:
        import openai  # type: ignore
        return bool(os.environ.get("OPENAI_API_KEY"))
    except Exception:
        return False


def handle_complete(msg: Dict[str, Any]):
    prompt = msg.get("prompt", "")
    if has_openai():
        import openai  # type: ignore
        openai.api_key = os.environ.get("OPENAI_API_KEY")
        resp = openai.ChatCompletion.create(
            model=msg.get("model", "gpt-3.5-turbo"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256,
            temperature=0.2,
        )
        text = resp.choices[0].message.content.strip()
    else:
        # simple fallback
        if not prompt:
            text = "No prompt provided."
        elif "summary" in prompt.lower():
            text = "Summary: This repo contains a TaskMaster web app with Docker support."
        else:
            text = "Stub completion: please provide more context for a detailed response."

    return {"id": msg.get("id"), "result": {"text": text}, "error": None}


def main():
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            msg = json.loads(raw)
        except Exception as e:
            send({"id": None, "result": None, "error": f"invalid json: {e}"})
            continue

        action = msg.get("action")
        if action == "ping":
            send(handle_ping(msg))
        elif action == "complete":
            send(handle_complete(msg))
        else:
            send({"id": msg.get("id"), "result": None, "error": f"unknown action: {action}"})


if __name__ == "__main__":
    main()
