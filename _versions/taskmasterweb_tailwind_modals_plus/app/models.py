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
        assigned_to: Optional assignee identifier (free text).
        estimate: Optional effort estimate (free text, e.g. "4h", "2d").
        labels: Optional list of label strings.
        created_at: Timestamp when the subtask was created (ISO 8601).
        updated_at: Timestamp when the subtask was last updated (ISO 8601).
        extra: Optional dictionary for additional attributes.
    """
    id: int
    title: str
    description: str
    status: str = "todo"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = field(default_factory=list)
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
        assigned_to: Optional assignee (free text).
        estimate: Optional effort estimate (free text, e.g. "4h", "2d").
        labels: Optional list of label strings.
        relations: Optional list of related task IDs.
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
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = field(default_factory=list)
    relations: List[int] = field(default_factory=list)
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
        assigned_to: Optional assignee.
        estimate: Optional effort estimate.
        labels: Optional list of labels.
        relations: Optional list of related task IDs.
    """
    title: str
    description: str
    priority: str = "medium"
    status: str = "todo"
    due_date: Optional[str] = None
    tag: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = field(default_factory=list)
    relations: List[int] = field(default_factory=list)


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
        assigned_to: Optional assignee.
        estimate: Optional estimate.
        labels: Optional list of labels.
    """
    parent_id: int
    title: str
    description: str
    status: str = "todo"
    due_date: Optional[str] = None
    tag: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = field(default_factory=list)


@dataclass
class UpdateTaskRequest:
    """Incoming request payload to update fields of an existing task.

    Attributes:
        title: Optional new title.
        description: Optional new description.
        priority: Optional new priority ("low", "medium", "high").
        status: Optional new status ("todo", "in-progress", "done").
        due_date: Optional new due date (YYYY-MM-DD or null to clear).
        assigned_to: Optional new assignee (null to clear).
        estimate: Optional new estimate (null to clear).
        labels: Optional new labels list (replaces existing).
        relations: Optional new relations list (replaces existing).
    """
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None
    relations: Optional[List[int]] = None


@dataclass
class UpdateSubTaskRequest:
    """Incoming request payload to update fields of an existing subtask.

    Attributes:
        title: Optional new title.
        description: Optional new description.
        status: Optional new status ("todo", "in-progress", "done").
        due_date: Optional new due date (YYYY-MM-DD or null to clear).
        assigned_to: Optional new assignee (null to clear).
        estimate: Optional new estimate (null to clear).
        labels: Optional new labels list (replaces existing).
    """
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None


@dataclass
class ApiResponse:
    """Generic API response wrapper."""
    ok: bool
    message: str
    data: Optional[dict] = None
