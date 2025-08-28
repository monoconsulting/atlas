
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

@dataclass
class SubTask:
    """Represents a subtask belonging to a parent task.

    Attributes:
        id: Unique integer identifier within the parent task scope.
        title: Short title of the subtask.
        description: Detailed description of the subtask.
        status: Current status ("todo", "pending", "in-progress", "done", "blocked", "deferred", "cancelled", "review").
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
        """Return a dict representation of this subtask."""
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
    deleted: bool = False
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Return a dict representation of this task."""
        d = asdict(self)
        d["relations"] = list(d.get("dependencies", []) or [])
        return d

@dataclass
class AddTaskRequest:
    """Request body for creating a task."""
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
    """Request body for creating a subtask."""
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
    """Request body for updating an existing task."""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None


    deleted: Optional[bool] = None

@dataclass
class UpdateSubTaskRequest:
    """Request body for updating an existing subtask."""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None
