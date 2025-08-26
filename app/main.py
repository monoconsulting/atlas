from __future__ import annotations
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from .storage import TaskStorage
from .models import AddTaskRequest, AddSubTaskRequest, UpdateTaskRequest, UpdateSubTaskRequest
from .database import (
    init_db, get_db, 
    Project, ProjectCreate, ProjectUpdate, ProjectResponse,
    get_all_projects, get_project_by_slug, get_project_by_id,
    create_project, update_project, delete_project
)

app = FastAPI(title="taskmasterweb", version="1.5.2")
storage = TaskStorage()

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9652", "http://127.0.0.1:9652", "http://localhost:8199", "http://127.0.0.1:8199"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")


class AddTaskModel(BaseModel):
    """Pydantic model for creating a task."""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=10000)
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    status: str = Field("pending", pattern="^(todo|pending|in-progress|done|deferred|cancelled|review)$")
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
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
    status: str = Field("pending", pattern="^(todo|pending|in-progress|done|deferred|cancelled|review)$")
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
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
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    status: Optional[str] = Field(None, pattern="^(todo|pending|in-progress|done|deferred|cancelled|review)$")
    due_date: Optional[str] = Field(None, pattern=r"^(\d{4}-\d{2}-\d{2})?$")
    assigned_to: Optional[str] = None
    estimate: Optional[str] = None
    labels: Optional[List[str]] = None
    dependencies: Optional[List[int]] = None
    deleted: Optional[bool] = None


class UpdateSubTaskModel(BaseModel):
    """Pydantic model for updating a subtask."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=10000)
    status: Optional[str] = Field(None, pattern="^(todo|pending|in-progress|done|deferred|cancelled|review)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    due_date: Optional[str] = Field(None, pattern=r"^(\d{4}-\d{2}-\d{2})?$")
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


# Database startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")


# Project management endpoints
@app.get("/api/projects", response_class=JSONResponse)
def list_projects(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """List all active projects."""
    projects = get_all_projects(db)
    return {"ok": True, "projects": [project.to_dict() for project in projects]}


@app.post("/api/projects", response_class=JSONResponse)
def create_new_project(project: ProjectCreate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Create a new project."""
    try:
        # Check if slug already exists
        existing = get_project_by_slug(db, project.slug)
        if existing:
            raise HTTPException(status_code=400, detail=f"Project with slug '{project.slug}' already exists")
        
        new_project = create_project(db, project)
        return {"ok": True, "project": new_project.to_dict()}
    except Exception as e:
        if "already exists" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")


@app.get("/api/projects/{project_id}", response_class=JSONResponse)
def get_project(project_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get a specific project by ID."""
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
    return {"ok": True, "project": project.to_dict()}


@app.patch("/api/projects/{project_id}", response_class=JSONResponse)
def update_existing_project(
    project_id: int, 
    project_update: ProjectUpdate, 
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update an existing project."""
    # Check if slug is being changed and if it conflicts
    if project_update.slug:
        existing = get_project_by_slug(db, project_update.slug)
        if existing and existing.id != project_id:
            raise HTTPException(status_code=400, detail=f"Project with slug '{project_update.slug}' already exists")
    
    updated_project = update_project(db, project_id, project_update)
    if not updated_project:
        raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
    
    return {"ok": True, "project": updated_project.to_dict()}


@app.delete("/api/projects/{project_id}", response_class=JSONResponse)
def delete_existing_project(project_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Delete (deactivate) a project."""
    success = delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
    
    return {"ok": True, "message": f"Project {project_id} deleted successfully"}


@app.get("/{project_slug}", response_class=HTMLResponse)
def serve_project(project_slug: str, db: Session = Depends(get_db)) -> HTMLResponse:
    """Serve the main application for a specific project based on URL slug."""
    # Check if project exists in database
    project = get_project_by_slug(db, project_slug)
    if not project or not project.active:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Serve the same index.html but with project context
    index_path = os.path.join(static_dir, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="index.html not found")
    
    # Read and modify the HTML to include project context
    with open(index_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    
    # Replace the title and project info with the actual project data
    html_content = html_content.replace(
        "TaskMaster AI — Development Hub", 
        f"TaskMaster AI — {project.name}"
    )
    html_content = html_content.replace(
        "Working Directory: /workspace", 
        f"Working Directory: {project.path}"
    )
    
    # Update API endpoints to use project-specific paths
    html_content = html_content.replace("fetch('/info')", f"fetch('/{project_slug}/info')")
    html_content = html_content.replace("fetch('/tasks')", f"fetch('/{project_slug}/tasks')")
    html_content = html_content.replace("fetch('/task'", f"fetch('/{project_slug}/task'")
    html_content = html_content.replace("fetch(`/task/", f"fetch(`/{project_slug}/task/")
    html_content = html_content.replace("fetch('/task/", f"fetch('/{project_slug}/task/")
    
    return HTMLResponse(html_content)


@app.get("/{project_slug}/tasks", response_class=JSONResponse)
def get_project_tasks(project_slug: str, tag: Optional[str] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get tasks for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if not project or not project.active:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance
    project_taskmaster_dir = os.path.join(project.path, ".taskmaster")
    project_storage = TaskStorage(base_dir=project_taskmaster_dir)
    return {"ok": True, "data": project_storage.list_tasks(tag=tag)}


@app.get("/{project_slug}/info", response_class=JSONResponse)
def get_project_info(project_slug: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get storage info for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if not project or not project.active:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance
    project_taskmaster_dir = os.path.join(project.path, ".taskmaster")
    project_storage = TaskStorage(base_dir=project_taskmaster_dir)
    return {"ok": True, "data": project_storage.info()}


@app.get("/{project_slug}/task/{task_id}", response_class=JSONResponse)
def get_project_task(project_slug: str, task_id: int, tag: Optional[str] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Return a single task by ID for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if not project or not project.active:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance
    project_taskmaster_dir = os.path.join(project.path, ".taskmaster")
    project_storage = TaskStorage(base_dir=project_taskmaster_dir)
    
    t = project_storage.get_task(task_id=task_id, tag=tag)
    if not t:
        raise HTTPException(status_code=404, detail=f"Task id {task_id} not found")
    return {"ok": True, "data": t}


@app.post("/{project_slug}/task", response_class=JSONResponse)
def add_project_task(project_slug: str, payload: AddTaskModel, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Create a task for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if not project or not project.active:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance
    project_taskmaster_dir = os.path.join(project.path, ".taskmaster")
    project_storage = TaskStorage(base_dir=project_taskmaster_dir)
    
    req = AddTaskRequest(**payload.dict())
    task = project_storage.add_task(req)
    return {"ok": True, "data": task.to_dict()}


@app.patch("/{project_slug}/task/{task_id}", response_class=JSONResponse)
def update_project_task(project_slug: str, task_id: int, payload: UpdateTaskModel, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Update a task by ID for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if not project or not project.active:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance
    project_taskmaster_dir = os.path.join(project.path, ".taskmaster")
    project_storage = TaskStorage(base_dir=project_taskmaster_dir)
    
    try:
        updated = project_storage.update_task(task_id=task_id, req=UpdateTaskRequest(**payload.dict()))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "data": updated}


@app.post("/{project_slug}/task/{task_id}/subtask", response_class=JSONResponse)
def add_project_subtask(project_slug: str, task_id: int, payload: AddSubTaskModel, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Create a subtask under a task for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if not project or not project.active:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance
    project_taskmaster_dir = os.path.join(project.path, ".taskmaster")
    project_storage = TaskStorage(base_dir=project_taskmaster_dir)
    
    if task_id != payload.parent_id:
        pass  # Allow flexibility for clients
    req = AddSubTaskRequest(**payload.dict())
    try:
        sub = project_storage.add_subtask(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "data": sub.to_dict()}


@app.patch("/{project_slug}/task/{task_id}/subtask/{sub_id}", response_class=JSONResponse)
def update_project_subtask(project_slug: str, task_id: int, sub_id: int, payload: UpdateSubTaskModel, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Update a subtask by ID under a task for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if not project or not project.active:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance
    project_taskmaster_dir = os.path.join(project.path, ".taskmaster")
    project_storage = TaskStorage(base_dir=project_taskmaster_dir)
    
    try:
        updated = project_storage.update_subtask(task_id=task_id, sub_id=sub_id, req=UpdateSubTaskRequest(**payload.dict()))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "data": updated}
