from __future__ import annotations
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from .storage import TaskStorage
from .models import AddTaskRequest, AddSubTaskRequest, UpdateTaskRequest, UpdateSubTaskRequest

app = FastAPI(title="taskmasterweb", version="1.5.2")
storage = TaskStorage()

static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


class AddTaskModel(BaseModel):
    """Pydantic model for creating a task."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=10000)
    priority: str = Field("medium", regex="^(low|medium|high)$")
    status: str = Field("todo", regex="^(todo|in-progress|done)$")
    due_date: Optional[str] = Field(None, regex=r"^\d{4}-\d{2}-\d{2}$")
    tag: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = []
    dependencies: List[int] = []

    @validator('labels', pre=True)
    def _labels_nonnull(cls, v):
        return v or []

    @validator('dependencies', pre=True)
    def _deps_nonnull(cls, v):
        return v or []


class AddSubTaskModel(BaseModel):
    """Pydantic model for creating a subtask."""
    parent_id: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=10000)
    status: str = Field("todo", regex="^(todo|in-progress|done)$")
    priority: str = Field("medium", regex="^(low|medium|high)$")
    due_date: Optional[str] = Field(None, regex=r"^\d{4}-\d{2}-\d{2}$")
    tag: Optional[str] = None
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: List[str] = []
    dependencies: List[int] = []

    @validator('labels', pre=True)
    def _labels_nonnull(cls, v):
        return v or []

    @validator('dependencies', pre=True)
    def _deps_nonnull(cls, v):
        return v or []


class UpdateTaskModel(BaseModel):
    """Pydantic model for updating a task."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=10000)
    priority: Optional[str] = Field(None, regex="^(low|medium|high)$")
    status: Optional[str] = Field(None, regex="^(todo|in-progress|done)$")
    due_date: Optional[str] = Field(None, regex=r"^(\d{4}-\d{2}-\d{2})?$")
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None


class UpdateSubTaskModel(BaseModel):
    """Pydantic model for updating a subtask."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=10000)
    status: Optional[str] = Field(None, regex="^(todo|in-progress|done)$")
    priority: Optional[str] = Field(None, regex="^(low|medium|high)$")
    due_date: Optional[str] = Field(None, regex=r"^(\d{4}-\d{2}-\d{2})?$")
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None


@app.get("/health", response_class=JSONResponse)
def health() -> Dict[str, Any]:
    """Healthcheck endpoint."""
    return {"ok": True, "message": "taskmasterweb is alive"}


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    """Serve the static index.html UI."""
    index_path = os.path.join(static_dir, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="index.html not found")
    return HTMLResponse(open(index_path, "r", encoding="utf-8").read())


@app.get("/info", response_class=JSONResponse)
def info() -> Dict[str, Any]:
    """Return storage/config info and inferred project name."""
    return {"ok": True, "data": storage.info()}


@app.get("/tasks", response_class=JSONResponse)
def tasks(tag: Optional[str] = None) -> Dict[str, Any]:
    """List tasks for a tag, defaulting to currentTag."""
    return {"ok": True, "data": storage.list_tasks(tag=tag)}


@app.get("/task/{task_id}", response_class=JSONResponse)
def get_task(task_id: int, tag: Optional[str] = None) -> Dict[str, Any]:
    """Return a single task by ID."""
    t = storage.get_task(task_id=task_id, tag=tag)
    if not t:
        raise HTTPException(status_code=404, detail=f"Task id {task_id} not found")
    return {"ok": True, "data": t}


@app.post("/task", response_class=JSONResponse)
def add_task(payload: AddTaskModel) -> Dict[str, Any]:
    """Create a task."""
    req = AddTaskRequest(**payload.dict())
    task = storage.add_task(req)
    return {"ok": True, "data": task.to_dict()}


@app.patch("/task/{task_id}", response_class=JSONResponse)
def update_task(task_id: int, payload: UpdateTaskModel) -> Dict[str, Any]:
    """Update a task by ID."""
    try:
        updated = storage.update_task(task_id=task_id, req=UpdateTaskRequest(**payload.dict()))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "data": updated}


@app.post("/task/{task_id}/subtask", response_class=JSONResponse)
def add_subtask(task_id: int, payload: AddSubTaskModel) -> Dict[str, Any]:
    """Create a subtask under a task."""
    if task_id != payload.parent_id:
        # parent_id must equal path param, but we don't hard-fail to allow clients that only send body.
        pass
    req = AddSubTaskRequest(**payload.dict())
    try:
        sub = storage.add_subtask(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "data": sub.to_dict()}


@app.patch("/task/{task_id}/subtask/{sub_id}", response_class=JSONResponse)
def update_subtask(task_id: int, sub_id: int, payload: UpdateSubTaskModel) -> Dict[str, Any]:
    """Update a subtask by ID under a task."""
    try:
        updated = storage.update_subtask(task_id=task_id, sub_id=sub_id, req=UpdateSubTaskRequest(**payload.dict()))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "data": updated}
