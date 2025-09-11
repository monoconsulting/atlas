from __future__ import annotations

"""
Task DB adapter: helpers to upsert tasks/subtasks into MySQL as a mirror of tasks.json.

Used by importer and optionally by storage dual-write.
"""

from typing import Dict, Any
from datetime import datetime

from .database import (
    SessionLocal,
    Task as DBTask,
    SubTask as DBSubTask,
    upsert_task_row,
    upsert_subtask_row,
)


def upsert_task_from_dict(db, project_id: int, tag: str, task: Dict[str, Any]) -> DBTask:
    """Upsert a single task and return the DB row."""
    row = upsert_task_row(db, project_id, tag, task)
    # Subtasks
    subtasks = task.get("subtasks") or []
    for st in subtasks:
        upsert_subtask_row(db, row.id, st)
    return row


def bulk_upsert_from_merged(db, project_id: int, merged_data: Dict[str, Any]) -> Dict[str, int]:
    """Upsert all tasks from merged task structure { tag: { tasks: [...] } }.

    Returns counts dict.
    """
    task_count = 0
    subtask_count = 0
    for tag, payload in (merged_data or {}).items():
        tasks = (payload or {}).get("tasks", [])
        for t in tasks:
            row = upsert_task_row(db, project_id, tag, t)
            task_count += 1
            for st in t.get("subtasks", []) or []:
                upsert_subtask_row(db, row.id, st)
                subtask_count += 1
    db.commit()
    return {"tasks": task_count, "subtasks": subtask_count}


def dual_write_task(project_id: int, tag: str, task: Dict[str, Any]) -> None:
    """Best-effort dual write for a single task (and its current subtasks)."""
    db = SessionLocal()
    try:
        upsert_task_from_dict(db, project_id, tag, task)
        db.commit()
    except Exception as e:
        # Best-effort: log and continue; JSON is still primary.
        print(f"[TaskDbAdapter] dual_write_task failed: {e}")
        db.rollback()
    finally:
        db.close()


def dual_write_subtask(project_id: int, tag: str, parent_local_id: int, subtask: Dict[str, Any]) -> None:
    """Best-effort dual write for a single subtask under a task key."""
    db = SessionLocal()
    try:
        # We need the parent task PK first
        from .database import get_task_row

        parent = get_task_row(db, project_id, tag, int(parent_local_id))
        if not parent:
            # Parent not in DB yet; write parent stub minimally
            parent_stub = {
                "id": int(parent_local_id),
                "title": subtask.get("title") or "",
                "status": "todo",
                "priority": "medium",
                "subtasks": [],
            }
            parent = upsert_task_row(db, project_id, tag, parent_stub)

        upsert_subtask_row(db, parent.id, subtask)
        db.commit()
    except Exception as e:
        print(f"[TaskDbAdapter] dual_write_subtask failed: {e}")
        db.rollback()
    finally:
        db.close()

