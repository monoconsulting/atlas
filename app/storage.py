
from __future__ import annotations
import json, os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from contextlib import contextmanager
from .models import Task, SubTask, AddTaskRequest, AddSubTaskRequest, UpdateTaskRequest, UpdateSubTaskRequest
from . import trace as tm_trace

try:
    import ijson  # optional dependency for streaming large JSON files
except Exception:
    ijson = None
import portalocker

class TaskStorage:
    """Read/write Taskmaster files in the mounted project."""
    
    # Configuration for large file handling
    LARGE_FILE_THRESHOLD = 100 * 1024  # 100KB
    
    def __init__(self, base_dir: str | Path | None = None) -> None:
        start_ts = time.time()
        print(f"[TaskStorage] __init__ start base_dir={base_dir} at {start_ts}")
        self._project_id: Optional[int] = None
        self._project_slug: Optional[str] = None

        # Default to /projects/atlas for the main project
        env_dir = os.getenv("TASKMASTER_DIR", "/projects/atlas/.taskmaster")

        # If base_dir is actually a project slug, resolve from DB
        if isinstance(base_dir, str) and not os.path.isabs(base_dir):
            # Lazy import DB only when we actually need slug resolution
            try:
                from sqlalchemy.orm import Session  # type: ignore
                from .database import get_project_by_slug, SessionLocal  # type: ignore
            except Exception as e:
                print(f"[TaskStorage] DB resolution unavailable: {e}")
                Session = None  # type: ignore
                get_project_by_slug = None  # type: ignore
                SessionLocal = None  # type: ignore

            db = None
            if SessionLocal and get_project_by_slug:
                try:
                    db = SessionLocal()
                    project = get_project_by_slug(db, base_dir)
                    if project:
                        resolved_path = getattr(project, "path", None)
                        if isinstance(resolved_path, str):
                            # Ensure we append .taskmaster to the project path
                            if not resolved_path.endswith('.taskmaster'):
                                resolved_path = os.path.join(resolved_path, '.taskmaster')
                            base_dir = resolved_path
                            # Cache resolved project identifiers
                            try:
                                self._project_id = int(getattr(project, "id"))
                            except Exception:
                                self._project_id = None
                            self._project_slug = getattr(project, "slug", None)
                except Exception as e:
                    print(f"[TaskStorage] failed to resolve project slug '{base_dir}' from DB: {e}")
                finally:
                    try:
                        if db is not None:
                            db.close()
                    except Exception:
                        pass

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
            # Default behavior - use /projects/atlas paths
            if not self.base_dir.exists():
                fb = Path("/projects/atlas/.taskmaster")
                if fb.exists():
                    self.base_dir = fb
                elif Path("/projects/atlas/taskmaster").exists():
                    self.base_dir = Path("/projects/atlas/taskmaster")
                else:
                    self.base_dir.mkdir(parents=True, exist_ok=True)
            # Only use environment variables if they are non-empty
            tasks_env = os.getenv("TASKS_FILE", "").strip()
            state_env = os.getenv("STATE_FILE", "").strip()
            config_env = os.getenv("CONFIG_FILE", "").strip()
            
            self.tasks_file = Path(tasks_env) if tasks_env else self.base_dir / "tasks" / "tasks.json"
            self.state_file = Path(state_env) if state_env else self.base_dir / "state.json"
            self.config_file = Path(config_env) if config_env else self.base_dir / "config.json"
        
        self.tasks_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Support for multiple task files (root tasks.json and .taskmaster/tasks/tasks.json)
        self.root_tasks_file = Path("tasks.json") if Path("tasks.json").exists() else None
        
        self.parsing_errors: List[Dict[str, Any]] = []
        self.duplicate_task_ids: List[Dict[str, Any]] = []

    def _resolve_project_id_by_path(self) -> Optional[int]:
        """Try to map base_dir to a project_id by matching project.path.
        We match the directory before '/.taskmaster'.
        """
        try:
            from .database import get_all_projects, SessionLocal
            base_dir_str = str(self.base_dir)
            if '/.taskmaster' in base_dir_str:
                project_path = base_dir_str.split('/.taskmaster')[0]
            else:
                project_path = base_dir_str
            db = SessionLocal()
            try:
                for p in get_all_projects(db):
                    if getattr(p, 'path', None) == project_path:
                        return int(getattr(p, 'id'))
            finally:
                db.close()
        except Exception as e:
            print(f"[TaskStorage] _resolve_project_id_by_path failed: {e}")
        return None

    def _should_dual_write(self) -> bool:
        return str(os.getenv('ATLAS_DB_DUAL_WRITE', '')).lower() in ('1', 'true', 'yes', 'on')

    def _maybe_dual_write_task(self, tag: str, task_dict: Dict[str, Any]) -> None:
        if not self._should_dual_write():
            return
        project_id = self._project_id or self._resolve_project_id_by_path()
        if not project_id:
            return
        try:
            from .task_db_adapter import dual_write_task
            dual_write_task(project_id, tag, task_dict)
        except Exception as e:
            print(f"[TaskStorage] dual_write_task hook failed: {e}")

    def _maybe_dual_write_subtask(self, tag: str, parent_local_id: int, subtask_dict: Dict[str, Any]) -> None:
        if not self._should_dual_write():
            return
        project_id = self._project_id or self._resolve_project_id_by_path()
        if not project_id:
            return
        try:
            from .task_db_adapter import dual_write_subtask
            dual_write_subtask(project_id, tag, parent_local_id, subtask_dict)
        except Exception as e:
            print(f"[TaskStorage] dual_write_subtask hook failed: {e}")

    def _get_file_size(self, path: Path) -> int:
        """Get file size in bytes."""
        return path.stat().st_size if path.exists() else 0
    
    def _is_large_file(self, path: Path) -> bool:
        """Check if file exceeds the large file threshold."""
        return self._get_file_size(path) > self.LARGE_FILE_THRESHOLD
    
    def _log_file_info(self, path: Path, operation: str = "read") -> None:
        """Log file size information for monitoring."""
        if path.exists():
            size = self._get_file_size(path)
            size_mb = size / (1024 * 1024)
            print(f"[TaskStorage] {operation.upper()} {path.name}: {size:,} bytes ({size_mb:.2f}MB)")
            if size > self.LARGE_FILE_THRESHOLD:
                print(f"[TaskStorage] WARNING: Large file detected, using streaming processing")
    
    def _read_json_streaming(self, path: Path) -> Dict[str, Any]:
        """Read large JSON files using streaming parser."""
        if not path.exists():
            return {}
        
        self._log_file_info(path, "streaming_read")
        tm_trace.log_event("fs_read", file=str(path), mode="streaming")
        
        try:
            with open(path, 'rb') as file:
                # Use ijson's items method to parse the entire structure
                # This is more memory-efficient than loading the whole file
                return dict(ijson.items(file, ''))
                
        except Exception as e:
            self.parsing_errors.append({"file": str(path), "error": str(e), "type": "streaming_parse_error"})
            print(f"[TaskStorage] Streaming parse failed for {path.name}: {e}")
            # Fallback to standard JSON parsing
            return self._read_json_fallback(path)
    
    def _read_json_fallback(self, path: Path) -> Dict[str, Any]:
        """Fallback JSON reading with error recovery."""
        if not path.exists():
            return {}
        
        txt = path.read_text(encoding="utf-8", errors="ignore").strip()
        if not txt:
            return {}
        
        try:
            return json.loads(txt)
        except json.JSONDecodeError as e:
            # Try to recover partial JSON
            first, last = txt.find("{"), txt.rfind("}")
            if first != -1 and last != -1 and last > first:
                try:
                    recovered_json = json.loads(txt[first:last+1])
                    self.parsing_errors.append({"file": str(path), "error": str(e), "type": "partial_json_recovery"})
                    print(f"[TaskStorage] Partial JSON recovered for {path.name}")
                    return recovered_json
                except json.JSONDecodeError:
                    pass
            
            self.parsing_errors.append({"file": str(path), "error": str(e), "type": "json_decode_error"})
            print(f"[TaskStorage] JSON parsing failed for {path.name}, returning empty structure")
            return {}
    
    def _read_json(self, path: Path) -> Dict[str, Any]:
        """Smart JSON reader that uses streaming for large files."""
        if not path.exists():
            return {}
        
        # Use streaming parser for large files
        if self._is_large_file(path):
            return self._read_json_streaming(path)
        else:
            self._log_file_info(path)
            return self._read_json_fallback(path)

    def _write_json(self, path: Path, data: Dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        body = json.dumps(data, indent=2, ensure_ascii=False)
        tmp.write_text(body, encoding="utf-8")
        tm_trace.log_event("fs_write_tmp", file=str(tmp), bytes=len(body.encode("utf-8")))
        tmp.replace(path)
        tm_trace.log_event("fs_replace", file=str(path))
        
        # Support for multiple task files (root tasks.json and .taskmaster/tasks/tasks.json)
        self.root_tasks_file = Path("tasks.json") if Path("tasks.json").exists() else None
        
        self.parsing_errors: List[Dict[str, Any]] = []
        self.duplicate_task_ids: List[Dict[str, Any]] = []

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

    @contextmanager
    def _file_lock(self):
        """Context manager for file locking during read-modify-write operations."""
        lock_file = self.tasks_file.with_suffix(".lock")
        lock_file.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(lock_file, 'w') as f:
                portalocker.lock(f, portalocker.LOCK_EX)
                yield
        finally:
            if lock_file.exists():
                try:
                    lock_file.unlink()
                except (OSError, FileNotFoundError):
                    pass  # Lock file cleanup is best effort

    def get_all_task_files(self) -> List[Path]:
        """Get all available task files (both root and .taskmaster)."""
        files = []
        
        # Add .taskmaster tasks file
        if self.tasks_file.exists():
            files.append(self.tasks_file)
        
        # Add root tasks.json if it exists
        if self.root_tasks_file and self.root_tasks_file.exists():
            files.append(self.root_tasks_file)
        
        return files
    
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
        """Load and merge tasks from all available task files."""
        merged_data = {}
        
        for file_path in self.get_all_task_files():
            try:
                print(f"[TaskStorage] Loading tasks from {file_path}")
                data = self._read_json(file_path)
                
                if not isinstance(data, dict):
                    continue
                
                # Ensure proper structure for each tag
                for k, v in data.items():
                    if not isinstance(v, dict) or "tasks" not in v:
                        data[k] = {"tasks": []}
                    else:
                        if not isinstance(v.get("tasks"), list):
                            v["tasks"] = []
                
                # Merge data, handling ID conflicts
                for tag, tag_data in data.items():
                    if tag not in merged_data:
                        merged_data[tag] = {"tasks": []}
                    
                    # Add tasks, ensuring unique IDs within each tag
                    existing_ids = {t.get("id") for t in merged_data[tag]["tasks"]}
                    
                    for task in tag_data.get("tasks", []):
                        task_id = task.get("id")
                        if task_id not in existing_ids:
                            merged_data[tag]["tasks"].append(task)
                            existing_ids.add(task_id)
                        else:
                            self.duplicate_task_ids.append({"file": str(file_path), "task_id": task_id, "tag": tag})
                            print(f"[TaskStorage] Skipping duplicate task ID {task_id} in tag {tag}")
                            
            except Exception as e:
                self.parsing_errors.append({"file": str(file_path), "error": str(e), "type": "merge_error"})
                print(f"[TaskStorage] Error loading {file_path}: {e}")
                continue
        
        return merged_data

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
                prompt=getattr(req, 'prompt', None),
                priority=req.priority, status=req.status, due_date=req.due_date,
                tag=tag, assigned_to=req.assigned_to, estimate=req.estimate,
                labels=list(req.labels or []), dependencies=list(req.dependencies or []),
                subtasks=[],
            )
            bucket["tasks"].append(task.to_dict())
            # _write_json also uses the same lock, but calling it while holding the lock is harmless.
            self._write_json(self.tasks_file, data)
            # Best-effort dual write to DB mirror (optional)
            try:
                self._maybe_dual_write_task(tag, task.to_dict())
            except Exception:
                pass
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
                prompt=getattr(req, 'prompt', None),
                status=req.status, priority=req.priority, due_date=req.due_date,
                assigned_to=req.assigned_to, estimate=req.estimate,
                labels=list(req.labels or []), dependencies=list(req.dependencies or []),
            )
            subs.append(st.to_dict())
            data[tag]["tasks"] = tasks
            self._write_json(self.tasks_file, data)
            # Best-effort dual write for subtask (optional)
            try:
                self._maybe_dual_write_subtask(tag, int(req.parent_id), st.to_dict())
            except Exception:
                pass
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
                    if getattr(req, 'prompt', None) is not None:
                        t["prompt"] = req.prompt
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
            # Best-effort dual write to DB mirror (optional)
            try:
                self._maybe_dual_write_task(tag, updated)
            except Exception:
                pass
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
                    if getattr(req, 'prompt', None) is not None:
                        st["prompt"] = req.prompt
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
            # Best-effort dual write for subtask (optional)
            try:
                self._maybe_dual_write_subtask(tag, int(task_id), updated)
            except Exception:
                pass
            return updated

    def info(self) -> Dict[str, Any]:
        print("=== STORAGE INFO CALLED ===")
        
        # Start with fallback project name
        project_name = os.getenv("PROJECT_NAME")
        if not project_name:
            parent = self.base_dir.parent
            project_name = parent.name if parent.exists() else "workspace"
            print(f"=== USING DEFAULT PROJECT_NAME: {project_name} ===")
        else:
            print(f"=== USING ENV PROJECT_NAME: {project_name} ===")
        
        # ALWAYS try to override with database project name using path matching
        try:
            from .database import get_db, get_all_projects
            base_dir_str = str(self.base_dir)
            print(f"[info] base_dir_str: {base_dir_str}")
            if '/projects/' in base_dir_str and '/.taskmaster' in base_dir_str:
                # Extract the project path (without /.taskmaster)
                project_path = base_dir_str.split('/.taskmaster')[0]
                print(f"[info] Extracted project_path: {project_path}")
                db_gen = get_db()
                db = next(db_gen)
                try:
                    projects = get_all_projects(db)
                    print(f"[info] Found {len(projects)} projects in database")
                    for project in projects:
                        print(f"[info] Checking project {project.slug}: path={project.path}")
                        if project.path and project.path == project_path:
                            print(f"[info] MATCH! Overriding project_name from '{project_name}' to '{project.name}'")
                            project_name = project.name
                            break
                    else:
                        print(f"[info] No database project found for path: {project_path}")
                finally:
                    db.close()
            else:
                print(f"[info] Path doesn't match expected pattern: {base_dir_str}")
        except Exception as e:
            print(f"[info] Exception during database override: {e}")
            pass  # Fallback to existing project_name
        
        # Get information about all task files
        task_files_info = []
        for file_path in self.get_all_task_files():
            size = self._get_file_size(file_path)
            task_files_info.append({
                "path": str(file_path),
                "size_bytes": size,
                "size_mb": round(size / (1024 * 1024), 2),
                "is_large": self._is_large_file(file_path),
                "exists": file_path.exists()
            })
        
        # Get task statistics from merged data
        data = self.ensure_tasks_struct()
        available_tags = list(data.keys())
        current_tag = self.get_current_tag()
        
        # Count tasks by status for current tag
        tasks = data.get(current_tag, {}).get("tasks", [])
        task_stats = {}
        for task in tasks:
            status = task.get("status", "unknown")
            task_stats[status] = task_stats.get(status, 0) + 1
        
        return {
            "base_dir": str(self.base_dir),
            "primary_tasks_file": str(self.tasks_file),
            "state_file": str(self.state_file),
            "config_file": str(self.config_file),
            "current_tag": current_tag,
            "available_tags": available_tags,
            "project_name": project_name,
            "task_files": task_files_info,
            "task_statistics": {
                "current_tag": current_tag,
                "total_tasks": len(tasks),
                "by_status": task_stats
            },
            "large_file_threshold_kb": self.LARGE_FILE_THRESHOLD // 1024,
            "streaming_enabled": any(info["is_large"] for info in task_files_info),
            "parsing_errors": self.parsing_errors,
            "duplicate_task_ids": self.duplicate_task_ids
        }
