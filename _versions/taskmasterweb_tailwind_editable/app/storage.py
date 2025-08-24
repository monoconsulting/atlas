"""
File storage and Taskmaster directory handling utilities.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from .models import Task, SubTask, AddTaskRequest, AddSubTaskRequest, UpdateTaskRequest, UpdateSubTaskRequest

class TaskStorage:
    """Manages reading/writing Taskmaster task files within a mounted project.

    The storage attempts to use the directory provided in the TASKMASTER_DIR
    environment variable. If that directory does not exist, it falls back
    to "/workspace/taskmaster".
    """

    def __init__(self, base_dir: str | Path | None = None) -> None:
        """Initialize storage with base directory.

        Args:
            base_dir: Optional base directory override. If not provided, the value
                is taken from the environment variable TASKMASTER_DIR (default:
                "/workspace/.taskmaster"). If the directory does not exist, a
                fallback to "/workspace/taskmaster" is attempted.
        """
        env_dir = os.getenv("TASKMASTER_DIR", "/workspace/.taskmaster")
        self.base_dir = Path(base_dir or env_dir)
        if not self.base_dir.exists():
            fallback = Path("/workspace/taskmaster")
            if fallback.exists():
                self.base_dir = fallback
            else:
                # Create default path if neither exists
                self.base_dir.mkdir(parents=True, exist_ok=True)

        self.tasks_file = Path(os.getenv("TASKS_FILE", str(self.base_dir / "tasks" / "tasks.json")))
        self.state_file = Path(os.getenv("STATE_FILE", str(self.base_dir / "state.json")))
        self.config_file = Path(os.getenv("CONFIG_FILE", str(self.base_dir / "config.json")))

        # Ensure tasks directory exists
        (self.tasks_file.parent).mkdir(parents=True, exist_ok=True)

    # ---------------- JSON helpers ----------------
    def _read_json(self, path: Path) -> Dict[str, Any]:
        """Read a JSON file with best-effort recovery for minor corruption.

        If the content is not valid JSON but appears to include a JSON object,
        attempts to strip leading/trailing non-JSON characters.

        Args:
            path: Path to the JSON file.

        Returns:
            Dict[str, Any]: Parsed JSON content or empty dict if not present.
        """
        if not path.exists():
            return {}
        text = path.read_text(encoding="utf-8", errors="ignore").strip()
        if not text:
            return {}
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to salvage JSON by extracting from first '{' to last '}'
            first = text.find("{")
            last = text.rfind("}")
            if first != -1 and last != -1 and last > first:
                candidate = text[first:last+1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    pass
            # Give up and return empty structure
            return {}

    def _write_json(self, path: Path, data: Dict[str, Any]) -> None:
        """Write a JSON file atomically.

        Args:
            path: Destination file path.
            data: JSON-serializable dictionary.
        """
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(path)

    # ---------------- Structure helpers ----------------
    def get_current_tag(self) -> str:
        """Return the current tag from state.json or fallback to 'master'."""
        state = self._read_json(self.state_file)
        tag = state.get("currentTag") if isinstance(state, dict) else None
        return tag or "master"

    def ensure_tasks_struct(self) -> Dict[str, Any]:
        """Ensure a valid tasks structure exists and return it.

        Returns:
            Dict[str, Any]: Dictionary with top-level keys as tags and values
            shaped like {"tasks": [ ... ]}.
        """
        data = self._read_json(self.tasks_file)
        if not isinstance(data, dict):
            data = {}
        for k, v in list(data.items()):
            if not isinstance(v, dict) or "tasks" not in v:
                data[k] = {"tasks": []}
            else:
                if not isinstance(v.get("tasks"), list):
                    v["tasks"] = []
                for t in v["tasks"]:
                    if not isinstance(t, dict):
                        continue
                    if "subtasks" not in t or not isinstance(t["subtasks"], list):
                        t["subtasks"] = []
        return data

    def _next_task_id(self, tasks: List[Dict[str, Any]]) -> int:
        """Compute next task id as 1 + max existing ids."""
        max_id = 0
        for t in tasks:
            try:
                max_id = max(max_id, int(t.get("id", 0)))
            except Exception:
                continue
        return max_id + 1

    def _next_subtask_id(self, subtasks: List[Dict[str, Any]]) -> int:
        """Compute next subtask id within a given parent task."""
        max_id = 0
        for st in subtasks:
            try:
                max_id = max(max_id, int(st.get("id", 0)))
            except Exception:
                continue
        return max_id + 1

    # ---------------- CRUD ----------------
    def add_task(self, req: AddTaskRequest) -> Task:
        """Append a new task to tasks.json under the selected tag."""
        data = self.ensure_tasks_struct()
        tag = req.tag or self.get_current_tag()
        tag_bucket = data.setdefault(tag, {"tasks": []})
        if "tasks" not in tag_bucket or not isinstance(tag_bucket["tasks"], list):
            tag_bucket["tasks"] = []

        new_id = self._next_task_id(tag_bucket["tasks"])
        task = Task(
            id=new_id,
            title=req.title,
            description=req.description,
            priority=req.priority,
            status=req.status,
            due_date=req.due_date,
            tag=tag,
            subtasks=[],
        )
        tag_bucket["tasks"].append(task.to_dict())
        self._write_json(self.tasks_file, data)
        return task

    def add_subtask(self, req: AddSubTaskRequest) -> SubTask:
        """Append a subtask beneath a given parent task ID."""
        data = self.ensure_tasks_struct()
        tag = req.tag or self.get_current_tag()
        tag_bucket = data.get(tag) or {"tasks": []}
        tasks = tag_bucket.get("tasks", [])

        # Locate parent task
        parent = None
        for t in tasks:
            if int(t.get("id", -1)) == int(req.parent_id):
                parent = t
                break
        if parent is None:
            raise ValueError(f"Parent task id {req.parent_id} not found in tag '{tag}'")

        if "subtasks" not in parent or not isinstance(parent["subtasks"], list):
            parent["subtasks"] = []

        new_id = self._next_subtask_id(parent["subtasks"])
        st = SubTask(
            id=new_id,
            title=req.title,
            description=req.description,
            status=req.status,
            due_date=req.due_date,
        )
        parent["subtasks"].append(st.to_dict())

        data[tag]["tasks"] = tasks
        self._write_json(self.tasks_file, data)
        return st

    def list_tasks(self, tag: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return tasks for a given tag (or current tag if omitted)."""
        data = self.ensure_tasks_struct()
        tag = tag or self.get_current_tag()
        bucket = data.get(tag) or {"tasks": []}
        tasks = bucket.get("tasks", [])
        for t in tasks:
            if "subtasks" not in t or not isinstance(t["subtasks"], list):
                t["subtasks"] = []
        return tasks

    def get_task(self, task_id: int, tag: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Return a single task by id for the given tag (or current tag)."""
        tag = tag or self.get_current_tag()
        tasks = self.list_tasks(tag=tag)
        for t in tasks:
            if int(t.get("id", -1)) == int(task_id):
                return t
        return None

    def update_task(self, task_id: int, req: UpdateTaskRequest, tag: Optional[str] = None) -> Dict[str, Any]:
        """Update a task's fields in place and persist."""
        data = self.ensure_tasks_struct()
        tag = tag or self.get_current_tag()
        bucket = data.get(tag) or {"tasks": []}
        tasks = bucket.get("tasks", [])

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
                # Touch updated_at
                t["updated_at"] = datetime.utcnow().isoformat() + "Z"
                updated = t
                break

        if updated is None:
            raise ValueError(f"Task id {task_id} not found in tag '{tag}'")

        data[tag]["tasks"] = tasks
        self._write_json(self.tasks_file, data)
        return updated

    def update_subtask(self, task_id: int, sub_id: int, req: UpdateSubTaskRequest, tag: Optional[str] = None) -> Dict[str, Any]:
        """Update a subtask's fields in place and persist."""
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

        if "subtasks" not in parent or not isinstance(parent["subtasks"], list):
            parent["subtasks"] = []

        updated = None
        for st in parent["subtasks"]:
            if int(st.get("id", -1)) == int(sub_id):
                if req.title is not None:
                    st["title"] = req.title
                if req.description is not None:
                    st["description"] = req.description
                if req.status is not None:
                    st["status"] = req.status
                if req.due_date is not None:
                    st["due_date"] = req.due_date
                st["updated_at"] = datetime.utcnow().isoformat() + "Z"
                updated = st
                break

        if updated is None:
            raise ValueError(f"Subtask id {sub_id} not found under task {task_id} in tag '{tag}'")

        data[tag]["tasks"] = tasks
        self._write_json(self.tasks_file, data)
        return updated

    # ---------------- Diagnostics ----------------
    def info(self) -> Dict[str, Any]:
        """Return basic info about detected paths for diagnostics."""
        # Try to derive a project name for display: env var PROJECT_NAME, else basename of a marker
        project_name = os.getenv("PROJECT_NAME")
        if not project_name:
            # If .taskmaster exists, use its parent name
            parent = self.base_dir.parent
            if parent.exists():
                project_name = parent.name
            else:
                project_name = "workspace"

        return {
            "base_dir": str(self.base_dir),
            "tasks_file": str(self.tasks_file),
            "state_file": str(self.state_file),
            "config_file": str(self.config_file),
            "current_tag": self.get_current_tag(),
            "project_name": project_name,
        }
