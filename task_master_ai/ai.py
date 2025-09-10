"""Minimal AI wrapper for generating simple responses.

This module tries to use OpenAI (via openai package) if an API key is present
in the environment as OPENAI_API_KEY. If not available, it provides a simple
rule-based fallback.
"""
from typing import Optional
import os


def _has_openai() -> bool:
    try:
        import openai  # type: ignore
        return bool(os.environ.get("OPENAI_API_KEY"))
    except Exception:
        return False


def chat(prompt: str, model: str = "gpt-3.5-turbo") -> str:
    """Return a short response to the prompt.

    If OpenAI credentials are present and the openai package is installed,
    it will call the API. Otherwise, it returns a deterministic fallback.
    """
    if _has_openai():
        import openai  # type: ignore

        openai.api_key = os.environ.get("OPENAI_API_KEY")
        resp = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256,
            n=1,
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip()

    # Fallback: very small deterministic responder
    if not prompt:
        return "I didn't get a prompt. Try describing the task you'd like help with."

    # simple heuristics
    p = prompt.lower()
    if "summary" in p or "summarize" in p:
        return "Summary: This repository contains a Python/Flask-like TaskMaster web app with Docker configs."
    if "how to run" in p or "run" in p:
        return "Run with Docker Compose (docker-compose up) or install requirements and run the app entrypoint."

    # default
    return "I can help draft task descriptions, summarize code, or suggest next steps. Give me a concrete request."
