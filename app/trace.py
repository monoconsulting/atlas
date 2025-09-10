from __future__ import annotations
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
import contextvars

_trace_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("trace_id", default=None)


def set_trace_id(value: Optional[str]) -> None:
    _trace_id.set(value)


def get_trace_id() -> Optional[str]:
    return _trace_id.get()


def _trace_dir() -> Path:
    base = Path(os.getenv("TRACE_DIR", "docs/architecture/trace"))
    base.mkdir(parents=True, exist_ok=True)
    return base


def log_event(kind: str, **kwargs: Any) -> None:
    if os.getenv("TRACE_ENABLED", "1") not in {"1", "true", "True"}:
        return
    entry: Dict[str, Any] = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "kind": kind,
        "trace_id": get_trace_id(),
    }
    entry.update(kwargs)
    day = datetime.utcnow().strftime("%Y%m%d")
    fp = _trace_dir() / f"trace-{day}.log"
    with fp.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


