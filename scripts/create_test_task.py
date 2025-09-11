import os
import sys
import time
from datetime import datetime

# Ensure repo root is on sys.path so 'app' can be imported
REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from app.storage import TaskStorage
from app.models import AddTaskRequest, AddSubTaskRequest


def main():
    # Resolve base_dir to this repo's .taskmaster folder
    repo_root = os.getcwd()
    base_dir = os.path.join(repo_root, ".taskmaster")

    # Allow override via CLI arg or env
    if len(sys.argv) > 1 and sys.argv[1]:
        base_dir = sys.argv[1]
    base_dir = os.environ.get("TASKMASTER_BASE_DIR", base_dir)

    storage = TaskStorage(base_dir=base_dir)

    ts = int(time.time())
    title = f"ATLAS Verification Task {ts}"
    desc = "Task created to verify dual-write/import. Safe to remove."

    # Create parent task
    task_req = AddTaskRequest(
        title=title,
        description=desc,
        priority="medium",
        status="todo",
    )
    task = storage.add_task(task_req)

    # Create a few subtasks
    subs = [
        ("Prepare context", "Collect inputs and constraints"),
        ("Implement change", "Apply minimal patch and verify"),
        ("Validate", "Run sanity checks and record ID"),
    ]
    for st_title, st_desc in subs:
        storage.add_subtask(
            AddSubTaskRequest(
                parent_id=int(task.id),
                title=st_title,
                description=st_desc,
                status="todo",
                priority="medium",
            )
        )

    print(f"CREATED_TASK_ID={int(task.id)}")


if __name__ == "__main__":
    main()
