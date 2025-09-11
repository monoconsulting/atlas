import json
import os
import sys
from pathlib import Path


def read_json_any(path: Path):
    raw = path.read_bytes()
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            txt = raw.decode(enc)
            return json.loads(txt), enc
        except Exception:
            continue
    raise ValueError("Unable to decode/parse JSON with utf-8/cp1252/latin-1")


def atomic_write_json(path: Path, data: dict):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def normalize_status(s: str | None) -> str:
    if not s:
        return "todo"
    s = str(s).strip().lower()
    aliases = {
        "planned": "pending",
        "in_progress": "in-progress",
        "inprogress": "in-progress",
        "backlog": "pending",
    }
    return aliases.get(s, s)


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/normalize_tasks_file.py <path-to-tasks.json>")
        return 2
    path = Path(sys.argv[1])
    if not path.exists():
        print(f"Not found: {path}")
        return 1

    data, enc = read_json_any(path)
    print(f"[normalize] Loaded {path} (encoding guessed: {enc})")

    # If already tag-structured, nothing to do
    if isinstance(data, dict) and any(isinstance(v, dict) and "tasks" in v for v in data.values()):
        print("[normalize] Looks tag-structured already. No change.\n")
        return 0

    # If flat format with top-level tasks array
    if isinstance(data, dict) and isinstance(data.get("tasks"), list):
        tasks = data.get("tasks")
        new_tasks = []
        for t in tasks:
            if not isinstance(t, dict):
                continue
            tt = dict(t)
            # Normalize status
            tt["status"] = normalize_status(tt.get("status"))
            # Map system_prompt -> prompt if present
            if "prompt" not in tt and "system_prompt" in tt:
                tt["prompt"] = tt.get("system_prompt")
            new_tasks.append(tt)

        out = {"master": {"tasks": new_tasks}}
        backup = path.with_suffix(path.suffix + ".bak_pre_norm")
        if not backup.exists():
            path.rename(backup)
        atomic_write_json(path, out)
        print(f"[normalize] Wrote tag-structured file with {len(new_tasks)} tasks")
        return 0

    print("[normalize] Unrecognized structure; no change")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

