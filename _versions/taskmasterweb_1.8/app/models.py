from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime

@dataclass
class SubTask:
    """Represents a subtask belonging to a parent task.
    
    Attributes:
        id: Unique integer identifier within the parent task scope.
        title: Short title of the subtask.
        description: Detailed description of the subtask.
        status: Current status ("todo", "in-progress", "done").
        priority: Priority ("low", "medium", "high").
        due_date: Optional due date YYYY-MM-DD.
        assigned_to: Optional assignee.
        estimate: Optional estimate string (e.g., "4h").
        labels: Optional list of labels.
        dependencies: Optional list of task IDs this subtask depends on.
        created_at: ISO timestamp when created.
        updated_at: ISO timestamp when last updated.
        extra: Optional bag for future keys.
    """
    id: int
    title: str
    description: str = ""
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = field(default_factory=list)
    dependencies: List[int] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class Task:
    """Represents a task entry stored in tasks.json.
    
    Attributes mirror the Taskmaster structure and add a "relations"
    mirror for backward compatibility.
    """
    id: int
    title: str
    description: str
    priority: str = "medium"
    status: str = "todo"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = field(default_factory=list)
    dependencies: List[int] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    tag: str = "master"
    subtasks: List[Dict[str, Any]] = field(default_factory=list)
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["relations"] = list(d.get("dependencies", []) or [])
        return d

@dataclass
class AddTaskRequest:
    title: str
    description: str
    priority: str = "medium"
    status: str = "todo"
    due_date: Optional[str] = None
    tag: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = field(default_factory=list)
    dependencies: List[int] = field(default_factory=list)

@dataclass
class AddSubTaskRequest:
    parent_id: int
    title: str
    description: str = ""
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[str] = None
    tag: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = field(default_factory=list)
    dependencies: List[int] = field(default_factory=list)

@dataclass
class UpdateTaskRequest:
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None

@dataclass
class UpdateSubTaskRequest:
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None
