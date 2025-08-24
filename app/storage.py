
from __future__ import annotations
import json, os
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from .models import Task, SubTask, AddTaskRequest, AddSubTaskRequest, UpdateTaskRequest, UpdateSubTaskRequest

class TaskStorage:
    """Read/write Taskmaster files in the mounted project."""
    def __init__(self, base_dir: str | Path | None = None) -> None:
        env_dir = os.getenv("TASKMASTER_DIR", "/workspace/.taskmaster")
        self.base_dir = Path(base_dir or env_dir)
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

    def _read_json(self, path: Path) -> Dict[str, Any]:
        if not path.exists():
            return {}
        txt = path.read_text(encoding="utf-8", errors="ignore").strip()
        if not txt:
            return {}
        try:
            return json.loads(txt)
        except json.JSONDecodeError:
            first, last = txt.find("{"), txt.rfind("}")
            if first != -1 and last != -1 and last > first:
                try:
                    return json.loads(txt[first:last+1])
                except json.JSONDecodeError:
                    pass
            return {}

    def _write_json(self, path: Path, data: Dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(path)

    def get_current_tag(self) -> str:
        st = self._read_json(self.state_file)
        tag = st.get("currentTag") if isinstance(st, dict) else None
        return tag or "master"

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
        self._write_json(self.tasks_file, data)
        return task

    def add_subtask(self, req: AddSubTaskRequest) -> SubTask:
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
