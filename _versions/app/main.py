"""
Minimal FastAPI app providing a simple HTML form and API to add tasks
into a Taskmaster (.taskmaster/taskmaster) structure in a mounted project.
"""
from __future__ import annotations

import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from .storage import TaskStorage
from .models import AddTaskRequest

app = FastAPI(title="taskmasterweb", version="1.0.0")
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
