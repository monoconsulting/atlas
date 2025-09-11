import os
import sys
from typing import List

# Ensure repo root on sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from app.storage import TaskStorage
from app.models import UpdateTaskRequest


def main():
    if len(sys.argv) < 4:
        print("Usage: python scripts/add_labels.py <project_slug> <label> <task_id> [<task_id> ...]")
        return 2

    slug = sys.argv[1]
    label = sys.argv[2]
    ids: List[int] = [int(x) for x in sys.argv[3:]]

    # Resolve base_dir on host
    host_projects = os.getenv("PROJECTS_HOST_DIR") or os.getenv("PROJECTS_DIR") or "E:/projects"
    base_dir = os.path.join(host_projects, slug, ".taskmaster")
    if not os.path.isdir(base_dir):
        print(f"[labels] WARNING: {base_dir} not found, falling back to slug-based resolution (may require DB)")
        storage = TaskStorage(base_dir=slug)
    else:
        storage = TaskStorage(base_dir=base_dir)

    updated = []
    for tid in ids:
        t = storage.get_task(task_id=tid, tag="master")
        if not t:
            print(f"[labels] Task {tid} not found, skipping")
            continue
        labels = list(t.get("labels") or [])
        if label in labels:
            print(f"[labels] Task {tid} already has label '{label}'")
            continue
        labels.append(label)
        storage.update_task(task_id=tid, req=UpdateTaskRequest(labels=labels))
        updated.append(tid)
        print(f"[labels] Added '{label}' to TM{tid}")

    print(f"[labels] Done. Updated: {updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

