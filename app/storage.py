
from __future__ import annotations
import json, os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from contextlib import contextmanager
from .models import Task, SubTask, AddTaskRequest, AddSubTaskRequest, UpdateTaskRequest, UpdateSubTaskRequest

try:
    import ijson  # optional dependency for streaming large JSON files
except Exception:
    ijson = None
import portalocker

class TaskStorage:
    """Read/write Taskmaster files in the mounted project."""
    def __init__(self, base_dir: str | Path | None = None) -> None:
        start_ts = time.time()
        print(f"[TaskStorage] __init__ start base_dir={base_dir} at {start_ts}")
        from sqlalchemy.orm import Session
        from .database import get_project_by_slug, SessionLocal

        env_dir = os.getenv("TASKMASTER_DIR", "/workspace/.taskmaster")

        # If base_dir is actually a project slug, resolve from DB
        if isinstance(base_dir, str) and not os.path.isabs(base_dir):
            db: Optional[Session] = None
            try:
                db = SessionLocal()
                project = get_project_by_slug(db, base_dir)
                if project:
                    resolved_path = getattr(project, "path", None)
                    if isinstance(resolved_path, str):
                        base_dir = resolved_path
            except Exception as e:
                print(f"[TaskStorage] failed to resolve project slug '{base_dir}' from DB: {e}")
            finally:
                if db is not None:
                    db.close()

        self.base_dir = Path(base_dir or env_dir)
        
        # If a custom base_dir is provided, use project-specific paths
        # Otherwise, use environment variables for backward compatibility
        if base_dir:
            # Project-specific paths - don't use environment variables
            if not self.base_dir.exists():
                self.base_dir.mkdir(parents=True, exist_ok=True)
            self.tasks_file = self.base_dir / "tasks" / "tasks.json"
            self.state_file = self.base_dir / "state.json"
            self.config_file = self.base_dir / "config.json"
        else:
            # Default behavior with environment variables
            if not self.base_dir.exists():
                fb = Path("/workspace/taskmaster")
                if fb.exists():
                    self.base_dir = fb
                else:
                    self.base_dir.mkdir(parents=True, exist_ok=True)
            self.tasks_file = Path(os.getenv("TASKS_FILE", str(self.base_dir / "tasks" / "tasks.json")))
            self.state_file = Path(os.getenv("STATE_FILE", str(self.base_dir / "state.json")))
            self.config_file = Path(os.getenv("CONFIG_FILE", str(self.base_dir / "config.json")))
        
        self.tasks_file.parent.mkdir(parents=True, exist_ok=True)

    def get_current_tag(self) -> str:
        """Get the current tag from state file, defaulting to 'master'."""
        if not self.state_file.exists():
            return "master"
        
        try:
            state_data = self._read_json(self.state_file)
            return state_data.get("currentTag", "master")
        except Exception:
            return "master"

    def ensure_tasks_struct(self) -> Dict[str, Any]:
        data = self._read_json(self.tasks_file)
        if not isinstance(data, dict):
            data = {}
        for k, v in list(data.items()):
            if not isinstance(v, dict) or "tasks" not in v:
                data[k] = {"tasks": []}
            else:
                if not isinstance(v.get("tasks"), list):
                    v["tasks"] = []
        return data

    def _next_task_id(self, tasks: List[Dict[str, Any]]) -> int:
        mx = 0
        for t in tasks:
            try:
                mx = max(mx, int(t.get("id", 0)))
            except Exception:
                pass
        return mx + 1

    def _next_subtask_id(self, subs: List[Dict[str, Any]]) -> int:
        mx = 0
        for s in subs:
            try:
                mx = max(mx, int(s.get("id", 0)))
            except Exception:
                pass
        return mx + 1

    def add_task(self, req: AddTaskRequest) -> Task:
        # Acquire lock to make the read-modify-write sequence atomic across processes
        with self._file_lock():
            data = self.ensure_tasks_struct()
            tag = req.tag or self.get_current_tag()
            bucket = data.setdefault(tag, {"tasks": []})
            new_id = self._next_task_id(bucket["tasks"])
            task = Task(
                id=new_id, title=req.title, description=req.description,
                priority=req.priority, status=req.status, due_date=req.due_date,
                tag=tag, assigned_to=req.assigned_to, estimate=req.estimate,
                labels=list(req.labels or []), dependencies=list(req.dependencies or []),
                subtasks=[],
            )
            bucket["tasks"].append(task.to_dict())
            # _write_json also uses the same lock, but calling it while holding the lock is harmless.
            self._write_json(self.tasks_file, data)
            return task

    def add_subtask(self, req: AddSubTaskRequest) -> SubTask:
        # Make the parent lookup and write atomic
        with self._file_lock():
            data = self.ensure_tasks_struct()
            tag = req.tag or self.get_current_tag()
            bucket = data.get(tag) or {"tasks": []}
            tasks = bucket.get("tasks", [])
            parent = None
            for t in tasks:
                if int(t.get("id", -1)) == int(req.parent_id):
                    parent = t
                    break
            if parent is None:
                raise ValueError(f"Parent task id {req.parent_id} not found in tag '{tag}'")
            subs = parent.setdefault("subtasks", [])
            new_id = self._next_subtask_id(subs)
            st = SubTask(
                id=new_id, title=req.title, description=req.description,
                status=req.status, priority=req.priority, due_date=req.due_date,
                assigned_to=req.assigned_to, estimate=req.estimate,
                labels=list(req.labels or []), dependencies=list(req.dependencies or []),
            )
            subs.append(st.to_dict())
            data[tag]["tasks"] = tasks
            self._write_json(self.tasks_file, data)
            return st

    def list_tasks(self, tag: Optional[str] = None, include_deleted: bool = False) -> List[Dict[str, Any]]:
        data = self.ensure_tasks_struct()
        tag = tag or self.get_current_tag()
        bucket = data.get(tag) or {"tasks": []}
        tasks = bucket.get("tasks", [])
        
        if not include_deleted:
            # Filter out deleted tasks (soft delete)
            tasks = [t for t in tasks if not t.get("deleted", False)]
        
        return tasks

    def get_task(self, task_id: int, tag: Optional[str] = None, include_deleted: bool = False) -> Optional[Dict[str, Any]]:
        tag = tag or self.get_current_tag()
        for t in self.list_tasks(tag=tag, include_deleted=include_deleted):
            if int(t.get("id", -1)) == int(task_id):
                return t
        return None

    def update_task(self, task_id: int, req: UpdateTaskRequest, tag: Optional[str] = None) -> Dict[str, Any]:
        # Acquire lock to perform read-modify-write atomically
        with self._file_lock():
            data = self.ensure_tasks_struct()
            tag = tag or self.get_current_tag()
            bucket = data.get(tag) or {"tasks": []}
            tasks = bucket.get("tasks", [])  # Include deleted tasks for updates
            updated = None
            for t in tasks:
                if int(t.get("id", -1)) == int(task_id):
                    if req.title is not None:
                        t["title"] = req.title
                    if req.description is not None:
                        t["description"] = req.description
                    if req.priority is not None:
                        t["priority"] = req.priority
                    if req.status is not None:
                        t["status"] = req.status
                    if req.due_date is not None:
                        t["due_date"] = req.due_date
                    if req.assigned_to is not None:
                        t["assigned_to"] = req.assigned_to
                    if req.estimate is not None:
                        t["estimate"] = req.estimate
                    if req.labels is not None:
                        t["labels"] = list(req.labels)
                    if req.dependencies is not None:
                        t["dependencies"] = list(req.dependencies)
                        t["relations"] = list(req.dependencies)
                    if req.deleted is not None:
                        t["deleted"] = req.deleted
                    t["updated_at"] = datetime.utcnow().isoformat() + "Z"
                    updated = t
                    break
            if updated is None:
                raise ValueError(f"Task id {task_id} not found in tag '{tag}'")
            data[tag]["tasks"] = tasks
            self._write_json(self.tasks_file, data)
            return updated

    def update_subtask(self, task_id: int, sub_id: int, req: UpdateSubTaskRequest, tag: Optional[str] = None) -> Dict[str, Any]:
        # Perform read-modify-write under lock to avoid races
        with self._file_lock():
            data = self.ensure_tasks_struct()
            tag = tag or self.get_current_tag()
            bucket = data.get(tag) or {"tasks": []}
            tasks = bucket.get("tasks", [])
            parent = None
            for t in tasks:
                if int(t.get("id", -1)) == int(task_id):
                    parent = t
                    break
            if parent is None:
                raise ValueError(f"Task id {task_id} not found in tag '{tag}'")
            subs = parent.setdefault("subtasks", [])
            updated = None
            for st in subs:
                if int(st.get("id", -1)) == int(sub_id):
                    if req.title is not None:
                        st["title"] = req.title
                    if req.description is not None:
                        st["description"] = req.description
                    if req.status is not None:
                        st["status"] = req.status
                    if req.priority is not None:
                        st["priority"] = req.priority
                    if req.due_date is not None:
                        st["due_date"] = req.due_date
                    if req.assigned_to is not None:
                        st["assigned_to"] = req.assigned_to
                    if req.estimate is not None:
                        st["estimate"] = req.estimate
                    if req.labels is not None:
                        st["labels"] = list(req.labels)
                    if req.dependencies is not None:
                        st["dependencies"] = list(req.dependencies)
                    st["updated_at"] = datetime.utcnow().isoformat() + "Z"
                    updated = st
                    break
            if updated is None:
                raise ValueError(f"Subtask id {sub_id} not found under task {task_id} in tag '{tag}'")
            data[tag]["tasks"] = tasks
            self._write_json(self.tasks_file, data)
            return updated

    def info(self) -> Dict[str, Any]:
        project_name = os.getenv("PROJECT_NAME")
        if not project_name:
            parent = self.base_dir.parent
            project_name = parent.name if parent.exists() else "workspace"
        return {
            "base_dir": str(self.base_dir),
            "tasks_file": str(self.tasks_file),
            "state_file": str(self.state_file),
            "config_file": str(self.config_file),
            "current_tag": self.get_current_tag(),
            "project_name": project_name,
        }
