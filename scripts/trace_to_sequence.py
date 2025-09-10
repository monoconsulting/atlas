from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, List, Any, Optional


def find_latest_trace_file(dir_path: Path) -> Optional[Path]:
    traces = sorted(dir_path.glob("trace-*.log"))
    return traces[-1] if traces else None


def load_events(fp: Path) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    with fp.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except Exception:
                pass
    return events


def last_trace_id(events: List[Dict[str, Any]]) -> Optional[str]:
    for ev in reversed(events):
        tid = ev.get("trace_id")
        if tid:
            return tid
    return None


def build_sequence_puml(events: List[Dict[str, Any]], trace_id: str) -> str:
    lines: List[str] = []
    lines.append("@startuml")
    lines.append("actor User")
    lines.append("participant API")
    lines.append("database FS")

    for ev in events:
        if ev.get("trace_id") != trace_id:
            continue
        kind = ev.get("kind")
        if kind == "request_start":
            lines.append(f"User -> API: {ev.get('method')} {ev.get('path')}")
        elif kind == "request_end":
            lines.append(f"API --> User: {ev.get('status')} ({ev.get('duration_ms')} ms)")
        elif kind == "fs_read":
            lines.append(f"API -> FS: read {Path(ev.get('file','?')).name} [{ev.get('mode')}]")
        elif kind == "fs_write_tmp":
            lines.append(f"API -> FS: write tmp {Path(ev.get('file','?')).name} ({ev.get('bytes')} bytes)")
        elif kind == "fs_replace":
            lines.append(f"API -> FS: replace {Path(ev.get('file','?')).name}")

    lines.append("@enduml")
    return "\n".join(lines)


def main():
    trace_dir = Path("docs/architecture/trace")
    trace_fp = find_latest_trace_file(trace_dir)
    out_dir = Path("docs/architecture")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_puml = out_dir / "seq-latest.puml"

    if not trace_fp:
        out_puml.write_text("@startuml\n' no traces found\n@enduml\n", encoding="utf-8")
        return

    events = load_events(trace_fp)
    tid = last_trace_id(events)
    if not tid:
        out_puml.write_text("@startuml\n' no trace id in logs\n@enduml\n", encoding="utf-8")
        return

    puml = build_sequence_puml(events, tid)
    out_puml.write_text(puml, encoding="utf-8")


if __name__ == "__main__":
    main()

