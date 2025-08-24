"""
FastAPI app providing a simple HTML form and API to add tasks and subtasks
into a Taskmaster structure in a mounted project.
"""
from __future__ import annotations

import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from .storage import TaskStorage
from .models import AddTaskRequest, AddSubTaskRequest

app = FastAPI(title="taskmasterweb", version="1.1.0")
storage = TaskStorage()

# Serve static index.html
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


class AddTaskModel(BaseModel):
    """Pydantic model for validating add-task HTTP payloads."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=10000)
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    status: str = Field("todo", pattern="^(todo|in-progress|done)$")
    due_date: Optional[str] = Field(None, pattern="^\d{4}-\d{2}-\d{2}$")
    tag: Optional[str] = None


class AddSubTaskModel(BaseModel):
    """Pydantic model for validating add-subtask HTTP payloads."""
    parent_id: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=10000)
    status: str = Field("todo", pattern="^(todo|in-progress|done)$")
    due_date: Optional[str] = Field(None, pattern="^\d{4}-\d{2}-\d{2}$")
    tag: Optional[str] = None


@app.get("/health", response_class=JSONResponse)
def health() -> Dict[str, Any]:
    """Health probe endpoint.

    Returns:
        Dict[str, Any]: A simple OK payload.
    """
    return {"ok": True, "message": "taskmasterweb is alive"}


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    """Serve the HTML UI."""
    index_path = os.path.join(static_dir, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="index.html not found")
    return HTMLResponse(open(index_path, "r", encoding="utf-8").read())


@app.get("/info", response_class=JSONResponse)
def info() -> Dict[str, Any]:
    """Return diagnostic info about file locations and current tag."""
    return {"ok": True, "data": storage.info()}


@app.get("/tasks", response_class=JSONResponse)
def tasks(tag: Optional[str] = None) -> Dict[str, Any]:
    """Return a list of tasks for the given or current tag.

    Args:
        tag: Optional explicit tag name to filter tasks.

    Returns:
        Dict[str, Any]: List of task dictionaries.
    """
    return {"ok": True, "data": storage.list_tasks(tag=tag)}


@app.post("/task", response_class=JSONResponse)
def add_task(payload: AddTaskModel) -> Dict[str, Any]:
    """Create a task in the mounted project's Taskmaster tasks.json.

    Args:
        payload: AddTaskModel - request body with task fields.

    Returns:
        Dict[str, Any]: Created task details.
    """
    req = AddTaskRequest(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status=payload.status,
        due_date=payload.due_date,
        tag=payload.tag,
    )
    task = storage.add_task(req)
    return {"ok": True, "data": task.to_dict()}


@app.post("/task/{task_id}/subtask", response_class=JSONResponse)
def add_subtask(task_id: int, payload: AddSubTaskModel) -> Dict[str, Any]:
    """Create a subtask under the specified parent task ID.

    Args:
        task_id: Parent task ID from the path.
        payload: AddSubTaskModel - request body with subtask fields.

    Returns:
        Dict[str, Any]: Created subtask details.
    """
    if task_id != payload.parent_id:
        # Keep both to avoid confusion; we rely on the URL id for parent binding.
        # We keep payload.parent_id for explicitness in logs and future validation.
        pass  # Not removing any fields; just allowing both.

    req = AddSubTaskRequest(
        parent_id=task_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        due_date=payload.due_date,
        tag=payload.tag,
    )
    try:
        sub = storage.add_subtask(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "data": sub.to_dict()}
