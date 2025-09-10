"""Quick smoke test to verify TaskStorage can persist a task and a subtask.

Usage: python scripts/smoke_test_subtasks.py

This will create a temporary directory under .tmp_smoke_test and print the tasks.json contents.
"""
from pathlib import Path
import shutil
import json
import sys

# Ensure we can import app.storage by adding repo root to path
repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root))

from app.storage import TaskStorage
from app.models import AddTaskRequest, AddSubTaskRequest

TMP = repo_root / '.tmp_smoke_test'
if TMP.exists():
    shutil.rmtree(TMP)
TMP.mkdir(parents=True, exist_ok=True)

storage = TaskStorage(base_dir=str(TMP))

# Create a task
req = AddTaskRequest(
    title='Smoke Test Task',
    description='Created by smoke test',
    priority='medium',
    status='todo'
)
task = storage.add_task(req)
print('Created task:', task.to_dict())

# Create a subtask
subreq = AddSubTaskRequest(
    parent_id=task.id,
    title='Smoke Test Subtask',
    description='Subtask by smoke test',
    priority='low',
    status='todo'
)
sub = storage.add_subtask(subreq)
print('Created subtask:', sub.to_dict())

# Show tasks.json
tasks_file = storage.tasks_file
print('\nTasks file path:', tasks_file)
print('Contents:')
print(json.dumps(storage._read_json(tasks_file), indent=2))

print('\nSmoke test complete. Temporary data at', TMP)
