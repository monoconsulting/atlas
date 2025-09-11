from __future__ import annotations

"""
Streaming importer that mirrors tasks from JSON files into MySQL.

Reads both .taskmaster/tasks/tasks.json and root tasks.json via TaskStorage's
merge logic, then upserts rows using Task DB adapter.
"""

from typing import Dict, Any

from .storage import TaskStorage
from .database import SessionLocal, get_project_by_slug
from .task_db_adapter import bulk_upsert_from_merged


class TaskJsonImporter:
    def __init__(self) -> None:
        pass

    def import_project_by_slug(self, slug: str) -> Dict[str, Any]:
        """Import tasks for a given project slug into DB.

        Returns summary dict with counts and file info.
        """
        db = SessionLocal()
        try:
            project = get_project_by_slug(db, slug)
            if not project:
                return {"ok": False, "error": f"project slug '{slug}' not found"}

            storage = TaskStorage(base_dir=slug)  # resolves slug → project path
            merged = storage.ensure_tasks_struct()
            counts = bulk_upsert_from_merged(db, project.id, merged)

            return {
                "ok": True,
                "project_id": project.id,
                "project_slug": slug,
                "counts": counts,
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}
        finally:
            db.close()

