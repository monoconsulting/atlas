"""
Data models for the taskmasterweb FastAPI application.
"""
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
        status: Current status string (e.g., "todo", "in-progress", "done").
        due_date: Optional due date in ISO format YYYY-MM-DD.
        created_at: Timestamp when the subtask was created (ISO 8601).
        updated_at: Timestamp when the subtask was last updated (ISO 8601).
        extra: Optional dictionary for additional attributes.
    """
    id: int
    title: str
    description: str
    status: str = "todo"
    due_date: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert this SubTask to a plain dictionary.

        Returns:
            Dict[str, Any]: Dictionary representation suitable for JSON serialization.
        """
        return asdict(self)


@dataclass
class Task:
    """Represents a task entry stored in the taskmaster tasks.json.

    Attributes:
        id: Unique integer identifier for the task. Will be auto-assigned.
        title: Short title summarizing the task.
        description: Detailed description of the task.
        priority: Priority string (e.g., "low", "medium", "high").
        status: Current status string (e.g., "todo", "in-progress", "done").
        due_date: Optional due date in ISO format YYYY-MM-DD.
        created_at: Timestamp when the task was created (ISO 8601).
        updated_at: Timestamp when the task was last updated (ISO 8601).
        tag: Logical tag/branch inside tasks.json (e.g., "master", "atlas").
        subtasks: List of child SubTask dictionaries.
        extra: Optional dictionary for additional attributes the CLI may use.
    """
    id: int
    title: str
    description: str
    priority: str = "medium"
    status: str = "todo"
    due_date: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    tag: str = "master"
    subtasks: List[Dict[str, Any]] = field(default_factory=list)
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert this Task to a plain dictionary.

        Returns:
            Dict[str, Any]: Dictionary representation suitable for JSON serialization.
        """
        return asdict(self)


@dataclass
class AddTaskRequest:
    """Incoming request payload to add a task via the API.

    Attributes:
        title: Short title of the new task.
        description: Detailed description of the new task.
        priority: Priority string ("low", "medium", "high").
        status: Initial status ("todo", "in-progress", "done").
        due_date: Optional due date in ISO format (YYYY-MM-DD).
        tag: Optional tag key inside tasks.json; if omitted the current tag from state.json is used.
    """
    title: str
    description: str
    priority: str = "medium"
    status: str = "todo"
    due_date: Optional[str] = None
    tag: Optional[str] = None


@dataclass
class AddSubTaskRequest:
    """Incoming request payload to add a subtask to a given task.

    Attributes:
        parent_id: ID of the parent task.
        title: Short title of the subtask.
        description: Detailed description of the subtask.
        status: Initial status ("todo", "in-progress", "done").
        due_date: Optional due date in ISO format (YYYY-MM-DD).
        tag: Optional tag key; defaults to current tag if not provided.
    """
    parent_id: int
    title: str
    description: str
    status: str = "todo"
    due_date: Optional[str] = None
    tag: Optional[str] = None


@dataclass
class ApiResponse:
    """Generic API response wrapper."""
    ok: bool
    message: str
    data: Optional[dict] = None
