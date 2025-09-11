from __future__ import annotations

"""
Task DB adapter: helpers to upsert tasks/subtasks into MySQL as a mirror of tasks.json.

Used by importer and optionally by storage dual-write.
"""

from typing import Dict, Any, List
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


def _row_to_task_dict(row: DBTask, subs: List[DBSubTask]) -> Dict[str, Any]:
    return {
        "id": int(row.local_id),
        "title": row.title or "",
        "description": row.description or "",
        "prompt": row.prompt or None,
        "status": row.status or "todo",
        "priority": row.priority or "medium",
        "due_date": row.due_date.isoformat() if row.due_date else None,
        "assigned_to": row.assigned_to or None,
        "estimate": row.estimate or None,
        "labels": list(row.labels_json or []),
        "dependencies": list(row.dependencies_json or []),
        "relations": list(row.dependencies_json or []),
        "created_at": row.created_at.isoformat() + "Z" if row.created_at else None,
        "updated_at": row.updated_at.isoformat() + "Z" if row.updated_at else None,
        "tag": row.tag,
        "deleted": bool(row.deleted),
        "subtasks": [
            {
                "id": int(st.local_id),
                "title": st.title or "",
                "description": st.description or "",
                "prompt": st.prompt or None,
                "status": st.status or "todo",
                "priority": st.priority or "medium",
                "due_date": st.due_date.isoformat() if st.due_date else None,
                "assigned_to": st.assigned_to or None,
                "estimate": st.estimate or None,
                "labels": list(st.labels_json or []),
                "dependencies": list(st.dependencies_json or []),
                "created_at": st.created_at.isoformat() + "Z" if st.created_at else None,
                "updated_at": st.updated_at.isoformat() + "Z" if st.updated_at else None,
            }
            for st in subs
        ],
    }


def get_grouped_tasks_from_db(db, project_id: int) -> Dict[str, Dict[str, Any]]:
    """Return { tag: {"tasks": [canonical dicts]} } for project."""
    grouped: Dict[str, List[DBTask]] = {}
    rows: List[DBTask] = db.query(DBTask).filter(DBTask.project_id == project_id).all()
    for r in rows:
        grouped.setdefault(r.tag, []).append(r)
    out: Dict[str, Dict[str, Any]] = {}
    for tag, task_rows in grouped.items():
        payload = {"tasks": []}
        for tr in task_rows:
            subs: List[DBSubTask] = db.query(DBSubTask).filter(DBSubTask.task_id == tr.id).all()
            payload["tasks"].append(_row_to_task_dict(tr, subs))
        out[tag] = payload
    return out


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
