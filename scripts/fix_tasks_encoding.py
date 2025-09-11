import json
import os
import sys
from pathlib import Path


def atomic_write(path: Path, text: str):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def try_load_json(text: str):
    try:
        return json.loads(text), None
    except json.JSONDecodeError as e:
        return None, e


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/fix_tasks_encoding.py <tasks.json path>")
        return 2
    path = Path(sys.argv[1])
    if not path.exists():
        print(f"Path not found: {path}")
        return 1

    raw = path.read_bytes()
    # First try UTF-8
    txt = None
    try:
        txt = raw.decode("utf-8")
        data, err = try_load_json(txt)
        if err is None:
            print("[fix] File already valid UTF-8 JSON. No changes.")
            return 0
    except UnicodeDecodeError:
        pass

    # Try Windows-1252 (cp1252)
    try:
        txt = raw.decode("cp1252")
        data, err = try_load_json(txt)
        if err is not None:
            # Attempt to recover first {...} block
            first = txt.find("{")
            last = txt.rfind("}")
            if first != -1 and last != -1 and last > first:
                core = txt[first : last + 1]
                data, err = try_load_json(core)
                if err is None:
                    txt = core
        if err is None:
            # Re-encode as UTF-8 and write atomically
            backup = path.with_suffix(path.suffix + ".bak_pre_utf8")
            if not backup.exists():
                path.rename(backup)
            atomic_write(path, json.dumps(data, ensure_ascii=False, indent=2))
            print(f"[fix] Converted to UTF-8 and wrote: {path}")
            return 0
        else:
            print(f"[fix] cp1252 decode succeeded but JSON parse failed: {err}")
    except UnicodeDecodeError:
        print("[fix] cp1252 decode failed as well")

    # As last resort, try ISO-8859-1
    try:
        txt = raw.decode("latin-1")
        data, err = try_load_json(txt)
        if err is None:
            backup = path.with_suffix(path.suffix + ".bak_pre_utf8")
            if not backup.exists():
                path.rename(backup)
            atomic_write(path, json.dumps(data, ensure_ascii=False, indent=2))
            print(f"[fix] Converted latin-1 → UTF-8 and wrote: {path}")
            return 0
        else:
            print(f"[fix] latin-1 parse failed: {err}")
    except UnicodeDecodeError:
        print("[fix] latin-1 decode failed")

    print("[fix] Unable to fix encoding/format automatically")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

