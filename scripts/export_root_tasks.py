import os
import sys
import json
from pathlib import Path

# Ensure repo root on sys.path
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.storage import TaskStorage


def atomic_write(path: Path, data: dict):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/export_root_tasks.py <project_slug>")
        return 2
    slug = sys.argv[1]

    # Resolve project root on host
    host_projects = os.getenv("PROJECTS_HOST_DIR") or os.getenv("PROJECTS_DIR") or "E:/projects"
    project_root = Path(host_projects) / slug
    if not project_root.exists():
        print(f"Project root not found: {project_root}")
        return 1

    storage = TaskStorage(base_dir=str(project_root / ".taskmaster"))
    tasks = storage.list_tasks(tag="master", include_deleted=True)

    out = {"tasks": tasks}
    out_file = project_root / "tasks.json"
    atomic_write(out_file, out)
    print(f"[export] Wrote flat tasks to {out_file} (count={len(tasks)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

