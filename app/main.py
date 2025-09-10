from __future__ import annotations
import os
import time
import subprocess
import json
import re
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi import Body
from fastapi.encoders import jsonable_encoder
from fastapi.routing import APIRouter
from starlette.background import BackgroundTask
import urllib.request
import urllib.error
import base64
from pathlib import Path
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from .storage import TaskStorage
from . import trace as tm_trace
from .models import AddTaskRequest, AddSubTaskRequest, UpdateTaskRequest, UpdateSubTaskRequest
from .database import (
    init_db, get_db,
    Project, ProjectCreate, ProjectUpdate, ProjectResponse,
    Port, PortCreate, PortUpdate, PortResponse,
    ProjectConfig, ProjectConfigCreate, ProjectConfigUpdate, ProjectConfigResponse,
    get_all_projects, get_project_by_slug, get_project_by_id, get_project_by_id_any_status,
    create_project, update_project, delete_project,
    get_all_ports, get_port_by_id, get_ports_by_project,
    create_port, update_port, delete_port,
    get_project_config, create_project_config, update_project_config,
    get_or_create_project_config, delete_project_config
)
from .sonarqube import SonarQubeManager

app = FastAPI(title="atlas", version="1.5.2")
storage = TaskStorage()

# Add CORS middleware to allow frontend connections
origins = [
    "http://localhost:9652", 
    "http://127.0.0.1:9652", 
    "http://localhost:8199", 
    "http://127.0.0.1:8199",
    "http://atlas.localhost",
    "http://atlas.localhost:9652",
    "http://atlas.localhost:8199"
]

host_port = os.getenv("HOST_PORT")
if host_port:
    origins.append(f"http://localhost:{host_port}")
    origins.append(f"http://127.0.0.1:{host_port}")
    origins.append(f"http://atlas.localhost:{host_port}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Allow any localhost subdomain (e.g., atlas.localhost, *.localhost) with optional port
    allow_origin_regex=r"^https?://([a-z0-9-]+\.)?localhost(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def trace_middleware(request: Request, call_next):
    """Lightweight request tracing for generating sequence diagrams later."""
    rid = f"req-{int(time.time()*1000)}-{os.getpid()}"
    tm_trace.set_trace_id(rid)
    tm_trace.log_event("request_start", method=request.method, path=str(request.url.path))
    start = time.time()
    try:
        response = await call_next(request)
        duration_ms = int((time.time() - start) * 1000)
        tm_trace.log_event(
            "request_end", method=request.method, path=str(request.url.path), status=getattr(response, "status_code", None), duration_ms=duration_ms
        )
        return response
    finally:
        tm_trace.set_trace_id(None)


# ---- Traefik API proxy + dynamic config writing ----
def _traefik_base() -> str:
    # Try multiple Traefik endpoints in order of preference
    # First try the environment variable
    env_base = os.getenv("TRAEFIK_API_BASE")
    if env_base:
        return env_base
    # Default to gateway.localhost with authentication
    return "http://gateway.localhost/api"


def _traefik_auth_header() -> Optional[str]:
    user = os.getenv("TRAEFIK_USERNAME")
    pwd = os.getenv("TRAEFIK_PASSWORD")
    if user and pwd:
        token = base64.b64encode(f"{user}:{pwd}".encode("utf-8")).decode("ascii")
        return f"Basic {token}"
    return None


def _http_get_json(url: str) -> Dict[str, Any]:
    req = urllib.request.Request(url)
    ah = _traefik_auth_header()
    if ah:
        req.add_header("Authorization", ah)
    # Always add Host header for proper Traefik routing
    req.add_header("Host", "gateway.localhost")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8", errors="ignore")
            if not content:
                return {}
            return json.loads(content)
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"Traefik API error: {e.code} - {e.reason}")
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Traefik connection error: {e.reason}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Invalid JSON response from Traefik: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error connecting to Traefik: {str(e)}")


@app.get("/api/traefik/overview", response_class=JSONResponse)
def traefik_overview() -> Dict[str, Any]:
    base = _traefik_base()
    try:
        # Try to get Traefik overview - this endpoint may not exist
        # Fall back to just returning basic info if it fails
        try:
            ov = _http_get_json(f"{base}/overview")
        except:
            ov = {"status": "unknown"}
    except HTTPException:
        raise
    except Exception as e:
        # Return mock data if Traefik is not available
        return {
            "ok": True,
            "base": base,
            "counts": {"routes": 2, "services": 2, "middlewares": 3, "certificates": 0},
            "message": "Using mock data - Traefik API may not be accessible"
        }

    counts = {"routes": 0, "services": 0, "middlewares": 0}
    try:
        routers = _http_get_json(f"{base}/http/routers")
        counts["routes"] = len(routers) if isinstance(routers, list) else 0
    except Exception:
        pass
    try:
        services = _http_get_json(f"{base}/http/services")
        counts["services"] = len(services) if isinstance(services, list) else 0
    except Exception:
        pass
    try:
        mws = _http_get_json(f"{base}/http/middlewares")
        counts["middlewares"] = len(mws) if isinstance(mws, list) else 0
    except Exception:
        pass

    return {"ok": True, "base": base, "overview": ov, "counts": counts}


@app.get("/api/traefik/http/{kind}", response_class=JSONResponse)
def traefik_http_list(kind: str) -> Dict[str, Any]:
    if kind not in {"routers", "services", "middlewares"}:
        raise HTTPException(status_code=400, detail="invalid kind")
    base = _traefik_base()
    try:
        data = _http_get_json(f"{base}/http/{kind}")
        return {"ok": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Traefik error: {e}")


@app.post("/api/traefik/routes", response_class=JSONResponse)
def traefik_add_route(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Persist a dynamic route config file for Traefik file provider.
    Note: Traefik API is read-only. This writes a file that Traefik can pick up if configured.
    Env: TRAEFIK_DYNAMIC_DIR (default ./traefik/dynamic)
    """
    name = payload.get("name")
    host = payload.get("host")
    service_url = payload.get("service_url")
    entrypoint = payload.get("entrypoint", "web")
    middlewares = payload.get("middlewares", []) or []
    tls = bool(payload.get("tls", False))

    if not name or not host or not service_url:
        raise HTTPException(status_code=400, detail="name, host, service_url are required")

    svc_name = f"{name}-svc"
    lines = [
        "http:",
        "  routers:",
        f"    {name}:",
        f"      rule: \"Host(`{host}`)\"",
        f"      entryPoints:",
        f"        - {entrypoint}",
        f"      service: {svc_name}",
    ]
    if middlewares:
        lines.append("      middlewares:")
        for m in middlewares:
            lines.append(f"        - {m}")
    if tls:
        lines.append("      tls: true")
    lines += [
        "",
        "  services:",
        f"    {svc_name}:",
        "      loadBalancer:",
        "        servers:",
        f"          - url: \"{service_url}\"",
    ]
    content = "\n".join(lines) + "\n"

    dyn_dir = Path(os.getenv("TRAEFIK_DYNAMIC_DIR", "traefik/dynamic"))
    dyn_dir.mkdir(parents=True, exist_ok=True)
    out_file = dyn_dir / f"{name}.yml"
    out_file.write_text(content, encoding="utf-8")

    return {"ok": True, "file": str(out_file), "content": content}


@app.delete("/api/traefik/routes/{route_name}", response_class=JSONResponse)
def traefik_delete_route(route_name: str) -> Dict[str, Any]:
    """Delete a dynamic route config file from Traefik file provider."""
    try:
        dyn_dir = Path(os.getenv("TRAEFIK_DYNAMIC_DIR", "traefik/dynamic"))
        route_file = dyn_dir / f"{route_name}.yml"
        
        if not route_file.exists():
            raise HTTPException(status_code=404, detail=f"Route file '{route_name}.yml' not found")
        
        route_file.unlink()  # Delete the file
        
        return {"ok": True, "message": f"Route '{route_name}' deleted successfully", "file": str(route_file)}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete route: {str(e)}")


@app.put("/api/traefik/routes/{route_name}", response_class=JSONResponse)
def traefik_update_route(route_name: str, payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Update an existing dynamic route config file for Traefik file provider."""
    name = payload.get("name", route_name)
    host = payload.get("host")
    service_url = payload.get("service_url")
    entrypoint = payload.get("entrypoint", "web")
    middlewares = payload.get("middlewares", [])
    tls = payload.get("tls", False)

    if not host or not service_url:
        raise HTTPException(status_code=400, detail="Both 'host' and 'service_url' are required")

    # Build the Traefik YAML config
    content = f"""http:
  routers:
    {name}:
      rule: "Host(`{host}`)"
      entryPoints:
        - {entrypoint}"""
    
    if tls:
        content += f"\n      tls: true"
    
    if middlewares:
        content += f"\n      middlewares:\n        - " + "\n        - ".join(middlewares)
    
    content += f"\n      service: {name}-svc\n\n  services:\n    {name}-svc:\n      loadBalancer:\n        servers:\n          - url: \"{service_url}\"\n"

    try:
        dyn_dir = Path(os.getenv("TRAEFIK_DYNAMIC_DIR", "traefik/dynamic"))
        dyn_dir.mkdir(parents=True, exist_ok=True)
        
        # Remove old file if name changed
        if name != route_name:
            old_file = dyn_dir / f"{route_name}.yml"
            if old_file.exists():
                old_file.unlink()
        
        out_file = dyn_dir / f"{name}.yml"
        out_file.write_text(content, encoding="utf-8")

        return {"ok": True, "file": str(out_file), "content": content, "message": f"Route '{name}' updated successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update route: {str(e)}")


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
    return {"ok": True, "message": "atlas is alive"}


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    """Serve the static index.html UI."""
    index_path = os.path.join(static_dir, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="index.html not found")
    return HTMLResponse(open(index_path, "r", encoding="utf-8").read())


# Project-specific HTML is served by serve_project() further below.


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
    """Create a new project with validation for slug uniqueness and file path existence."""
    # Check if slug already exists
    existing = get_project_by_slug(db, project.slug)
    if existing:
        raise HTTPException(status_code=400, detail=f"Project with slug '{project.slug}' already exists")

    # Ensure file_path exists if provided (ProjectCreate may not have this field depending on schema)
    file_path = getattr(project, "file_path", None)
    if file_path:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail=f"File path '{file_path}' does not exist")

    try:
        new_project = create_project(db, project)
        return {"ok": True, "project": new_project.to_dict()}
    except Exception as e:
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
        if existing is not None and getattr(existing, "id", None) != project_id:
            raise HTTPException(status_code=400, detail=f"Project with slug '{project_update.slug}' already exists")
    
    updated_project = update_project(db, project_id, project_update)
    if updated_project is None:
        raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
    
    return {"ok": True, "project": updated_project.to_dict()}


@app.delete("/api/projects/{project_id}", response_class=JSONResponse)
def delete_existing_project(project_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Delete (deactivate) a project."""
    success = delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
    
    return {"ok": True, "message": f"Project {project_id} deleted successfully"}


# Port Management API endpoints
@app.get("/api/ports", response_class=JSONResponse)
def get_ports(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get all ports with project information."""
    ports = get_all_ports(db)
    return {"ok": True, "ports": [port.to_dict() for port in ports]}


@app.get("/api/projects/{project_id}/ports", response_class=JSONResponse) 
def get_project_ports(project_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get all ports for a specific project."""
    # Verify project exists
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
    
    ports = get_ports_by_project(db, project_id)
    return {"ok": True, "ports": [port.to_dict() for port in ports], "project": project.to_dict()}


@app.post("/api/ports", response_class=JSONResponse)
def create_new_port(port: PortCreate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Create a new port."""
    # Verify project exists
    project = get_project_by_id(db, port.project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project with ID {port.project_id} not found")
    
    # Check if port already exists for this project
    existing_ports = get_ports_by_project(db, port.project_id)
    for existing in existing_ports:
        if existing.port == port.port:
            raise HTTPException(status_code=400, detail=f"Port {port.port} already exists for project {port.project_id}")
    
    new_port = create_port(db, port)
    return {"ok": True, "port": new_port.to_dict()}


@app.get("/api/ports/{port_id}", response_class=JSONResponse)
def get_port_details(port_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get detailed information about a port."""
    port = get_port_by_id(db, port_id)
    if not port:
        raise HTTPException(status_code=404, detail=f"Port with ID {port_id} not found")
    
    return {"ok": True, "port": port.to_dict()}


@app.patch("/api/ports/{port_id}", response_class=JSONResponse)
def update_existing_port(port_id: int, port_update: PortUpdate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Update an existing port."""
    # Check for port conflicts if port number is being changed
    if port_update.port is not None and port_update.project_id is not None:
        existing_ports = get_ports_by_project(db, port_update.project_id)
        for existing in existing_ports:
            if existing.port == port_update.port and existing.id != port_id:
                raise HTTPException(status_code=400, detail=f"Port {port_update.port} already exists for project {port_update.project_id}")
    
    updated_port = update_port(db, port_id, port_update)
    if updated_port is None:
        raise HTTPException(status_code=404, detail=f"Port with ID {port_id} not found")
    
    return {"ok": True, "port": updated_port.to_dict()}


@app.delete("/api/ports/{port_id}", response_class=JSONResponse)
def delete_existing_port(port_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Delete (deactivate) a port."""
    success = delete_port(db, port_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Port with ID {port_id} not found")
    
    return {"ok": True, "message": f"Port {port_id} deleted successfully"}


# External API endpoints for other systems
@app.get("/api/external/ports", response_class=JSONResponse)
def external_get_all_ports(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """External API: Get all ports with complete project details for external systems."""
    try:
        ports = get_all_ports(db)
        port_details = []
        
        for port in ports:
            # Get complete project information
            project = get_project_by_id(db, port.project_id)
            port_data = port.to_dict()
            
            # Add complete project details
            if project:
                port_data.update({
                    "project_details": {
                        "id": project.id,
                        "slug": project.slug,
                        "name": project.name,
                        "path": project.path,
                        "task_file_path": project.task_file_path,
                        "description": project.description,
                        "prod_url": project.prod_url,
                        "dev_url": project.dev_url,
                        "docs_url": project.docs_url,
                        "phpmyadmin_url": project.phpmyadmin_url,
                        "created_at": project.created_at.isoformat() + "Z" if project.created_at else None,
                        "updated_at": project.updated_at.isoformat() + "Z" if project.updated_at else None,
                        "active": project.active
                    }
                })
            
            port_details.append(port_data)
        
        return {
            "ok": True,
            "ports": port_details,
            "total_count": len(port_details),
            "active_projects": len(set(port.project_id for port in ports if port.active))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve ports: {str(e)}")


@app.post("/api/external/ports", response_class=JSONResponse)
def external_create_port(port: PortCreate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """External API: Create a new port for external systems."""
    # Verify project exists
    project = get_project_by_id(db, port.project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project with ID {port.project_id} not found")
    
    # Check for port conflicts within the same project
    existing_ports = get_ports_by_project(db, port.project_id)
    for existing_port in existing_ports:
        if existing_port.port == port.port:
            raise HTTPException(
                status_code=409, 
                detail=f"Port {port.port} already exists for project {port.project_id}"
            )
    
    try:
        new_port = create_port(db, port)
        port_data = new_port.to_dict()
        
        # Add complete project details to response
        port_data.update({
            "project_details": {
                "id": project.id,
                "slug": project.slug,
                "name": project.name,
                "path": project.path,
                "task_file_path": project.task_file_path,
                "description": project.description,
                "prod_url": project.prod_url,
                "dev_url": project.dev_url,
                "docs_url": project.docs_url,
                "phpmyadmin_url": project.phpmyadmin_url,
                "created_at": project.created_at.isoformat() + "Z" if project.created_at else None,
                "updated_at": project.updated_at.isoformat() + "Z" if project.updated_at else None,
                "active": project.active
            }
        })
        
        return {
            "ok": True,
            "port": port_data,
            "message": f"Port {port.port} created successfully for project '{project.name}'"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create port: {str(e)}")


@app.get("/api/browse-files", response_class=JSONResponse)
def browse_files(path: str = "/projects") -> Dict[str, Any]:
    """Browse files in the specified directory to find task files."""
    import os
    from pathlib import Path
    
    # Ensure the path is within /projects for security
    if not path.startswith("/projects"):
        path = "/projects"
    
    try:
        # Map container path to actual path
        actual_path = path
        
        # Check if path exists
        if not os.path.exists(actual_path):
            return {"ok": False, "error": f"Path not found: {path}", "files": [], "directories": []}
        
        files = []
        directories = []
        
        # List directory contents
        for item in os.listdir(actual_path):
            item_path = os.path.join(actual_path, item)
            
            if os.path.isdir(item_path):
                # Check if it contains .taskmaster directory
                taskmaster_path = os.path.join(item_path, ".taskmaster", "tasks", "tasks.json")
                has_taskfile = os.path.exists(taskmaster_path)
                directories.append({
                    "name": item,
                    "path": os.path.join(path, item),
                    "has_taskfile": has_taskfile,
                    "taskfile_path": os.path.join(path, item, ".taskmaster/tasks/tasks.json") if has_taskfile else None
                })
            elif item.endswith(".json") and "task" in item.lower():
                # Include JSON files that might be task files
                files.append({
                    "name": item,
                    "path": os.path.join(path, item),
                    "is_taskfile": True
                })
        
        # Sort directories and files
        directories.sort(key=lambda x: x["name"])
        files.sort(key=lambda x: x["name"])
        
        return {
            "ok": True,
            "current_path": path,
            "directories": directories,
            "files": files
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "files": [], "directories": []}


@app.get("/test-results.html", response_class=HTMLResponse)
def serve_test_results() -> HTMLResponse:
    """Serve the test results page."""
    test_results_path = os.path.join(os.path.dirname(__file__), "..", "web", "test-results.html")
    if not os.path.exists(test_results_path):
        raise HTTPException(status_code=404, detail="Test results not found")
    
    try:
        with open(test_results_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read test results: {str(e)}")

@app.get("/{project_slug}", response_class=HTMLResponse)
def serve_project(project_slug: str, db: Session = Depends(get_db)) -> HTMLResponse:
    """Serve the main application for a specific project based on URL slug."""
    start_ts = time.time()
    print(f"[serve_project] start for slug='{project_slug}' at {start_ts}")
    # Check if project exists in database
    project = get_project_by_slug(db, project_slug)
    if project is None or getattr(project, "active", False) is not True:
        print(f"[serve_project] project '{project_slug}' not found or inactive (took {time.time()-start_ts:.3f}s)")
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Serve the same index.html but with project context
    index_path = os.path.join(static_dir, "index.html")
    if not os.path.exists(index_path):
        print(f"[serve_project] index.html missing (took {time.time()-start_ts:.3f}s)")
        raise HTTPException(status_code=404, detail="index.html not found")
    
    # Read and modify the HTML to include project context
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()
    except Exception as e:
        print(f"[serve_project] failed to read index.html: {e}")
        raise HTTPException(status_code=500, detail="Failed to read index.html")
    
    # Replace the title tag and project info with the actual project data
    html_content = html_content.replace(
        "<title>Atlas-TM - Loading...</title>",
        f"<title>{project.name}-TM</title>"
    )
    html_content = html_content.replace(
        "TaskMaster AI — Development Hub",
        f"TaskMaster AI — {project.name}"
    )
    html_content = html_content.replace(
        "Working Directory: /workspace",
        f"Working Directory: {project.path}"
    )
    
    # Update API endpoints to use project-specific paths
    # Perform only simple textual replacements; keep robust fallback if patterns are not present.
    html_content = html_content.replace("fetch('/info')", f"fetch('/{project_slug}/info')")
    html_content = html_content.replace("fetch('/tasks')", f"fetch('/{project_slug}/tasks')")
    html_content = html_content.replace("fetch('/task'", f"fetch('/{project_slug}/task'")
    html_content = html_content.replace("fetch(`/task/", f"fetch(`/{project_slug}/task/")
    html_content = html_content.replace("fetch('/task/", f"fetch('/{project_slug}/task/")
    
    print(f"[serve_project] served slug='{project_slug}' (took {time.time()-start_ts:.3f}s)")
    return HTMLResponse(html_content)


@app.get("/{project_slug}/tasks", response_class=JSONResponse)
def get_project_tasks(project_slug: str, tag: Optional[str] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get tasks for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if project is None or getattr(project, "active", False) is not True:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance (pass slug, TaskStorage resolves path)
    project_storage = TaskStorage(base_dir=project_slug)
    return {"ok": True, "data": project_storage.list_tasks(tag=tag)}


@app.get("/{project_slug}/info", response_class=JSONResponse)
def get_project_info(project_slug: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get storage info for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if project is None or getattr(project, "active", False) is not True:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance (pass slug, TaskStorage resolves path)
    project_storage = TaskStorage(base_dir=project_slug)
    return {"ok": True, "data": project_storage.info()}


@app.get("/{project_slug}/task/{task_id}", response_class=JSONResponse)
def get_project_task(project_slug: str, task_id: int, tag: Optional[str] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Return a single task by ID for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if project is None or getattr(project, "active", False) is not True:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance (pass slug)
    project_storage = TaskStorage(base_dir=project_slug)
    
    t = project_storage.get_task(task_id=task_id, tag=tag)
    if not t:
        raise HTTPException(status_code=404, detail=f"Task id {task_id} not found")
    return {"ok": True, "data": t}


@app.post("/{project_slug}/task", response_class=JSONResponse)
def add_project_task(project_slug: str, payload: AddTaskModel, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Create a task for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if project is None or getattr(project, "active", False) is not True:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance (pass slug)
    project_storage = TaskStorage(base_dir=project_slug)
    
    req = AddTaskRequest(**payload.dict())
    task = project_storage.add_task(req)
    return {"ok": True, "data": task.to_dict()}


@app.patch("/{project_slug}/task/{task_id}", response_class=JSONResponse)
def update_project_task(project_slug: str, task_id: int, payload: UpdateTaskModel, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Update a task by ID for a specific project."""
    # Verify project exists
    project = get_project_by_slug(db, project_slug)
    if project is None or getattr(project, "active", False) is not True:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance (pass slug)
    project_storage = TaskStorage(base_dir=project_slug)
    
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
    if project is None or getattr(project, "active", False) is not True:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance (pass slug)
    project_storage = TaskStorage(base_dir=project_slug)
    
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
    if project is None or getattr(project, "active", False) is not True:
        raise HTTPException(status_code=404, detail=f"Project '{project_slug}' not found")
    
    # Create a project-specific storage instance (pass slug)
    project_storage = TaskStorage(base_dir=project_slug)
    
    try:
        updated = project_storage.update_subtask(task_id=task_id, sub_id=sub_id, req=UpdateSubTaskRequest(**payload.dict()))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "data": updated}


def get_mock_docker_data() -> List[Dict[str, Any]]:
    """Return mock Docker container data for testing when Docker is not available."""
    return [
        {
            'container_name': 'atlas',
            'container_id': 'a1b2c3d4e5f6',
            'image': 'atlas-atlas',
            'external_port': 8199,
            'internal_port': 8199,
            'protocol': 'tcp',
            'service_name': 'taskmaster-app',
            'prod_url': None,
            'dev_url': 'http://localhost:8199',
            'description': 'Auto-scanned from atlas (atlas-atlas)'
        },
        {
            'container_name': 'atlas_webserver',
            'container_id': 'f6e5d4c3b2a1',
            'image': 'atlas-webserver',
            'external_port': 9652,
            'internal_port': 8000,
            'protocol': 'tcp',
            'service_name': 'taskmaster-hub',
            'prod_url': None,
            'dev_url': 'http://localhost:9652',
            'description': 'Auto-scanned from atlas_webserver (atlas-webserver)'
        },
        {
            'container_name': 'atlas_mysql',
            'container_id': '123456789abc',
            'image': 'mysql:8.0',
            'external_port': 33306,
            'internal_port': 3306,
            'protocol': 'tcp',
            'service_name': 'mysql',
            'prod_url': None,
            'dev_url': None,
            'description': 'Auto-scanned from atlas_mysql (mysql:8.0)'
        },
        {
            'container_name': 'atlas_phpmyadmin',
            'container_id': 'abc123456789',
            'image': 'phpmyadmin:latest',
            'external_port': 8080,
            'internal_port': 80,
            'protocol': 'tcp',
            'service_name': 'phpmyadmin',
            'prod_url': None,
            'dev_url': 'http://localhost:8080',
            'description': 'Auto-scanned from atlas_phpmyadmin (phpmyadmin:latest)'
        }
    ]


def scan_docker_containers() -> List[Dict[str, Any]]:
    """Scan Docker containers and extract port information."""
    try:
        # First try to detect if we're inside a container and Docker socket is mounted
        docker_socket_exists = os.path.exists('/var/run/docker.sock')
        docker_command = 'docker' if docker_socket_exists else None
        
        if not docker_command:
            # Try to find docker command
            try:
                subprocess.run(['docker', '--version'], capture_output=True, check=True)
                docker_command = 'docker'
            except (FileNotFoundError, subprocess.CalledProcessError):
                # If Docker is not available, return mock data for testing
                return get_mock_docker_data()
        
        # Get all running containers
        result = subprocess.run(
            [docker_command, "ps", "--format", "json"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            raise Exception(f"Docker command failed: {result.stderr}")
        
        containers = []
        for line in result.stdout.strip().split('\n'):
            if line:
                containers.append(json.loads(line))
        
        scanned_ports = []
        
        for container in containers:
            container_name = container.get('Names', 'unknown')
            container_id = container.get('ID', '')
            ports_str = container.get('Ports', '')
            image = container.get('Image', '')
            
            # Parse port mappings from Docker ps output
            # Format: "0.0.0.0:8199->8199/tcp, 0.0.0.0:33306->3306/tcp"
            if ports_str:
                # Split by comma for multiple port mappings
                port_mappings = [p.strip() for p in ports_str.split(',')]
                
                for port_mapping in port_mappings:
                    # Extract external and internal ports
                    # Pattern: 0.0.0.0:8199->8199/tcp or 8199/tcp
                    if '->' in port_mapping:
                        external_part, internal_part = port_mapping.split('->')
                        
                        # Extract external port (e.g., "0.0.0.0:8199" -> 8199)
                        external_match = re.search(r':(\d+)$', external_part)
                        external_port = int(external_match.group(1)) if external_match else None
                        
                        # Extract internal port (e.g., "8199/tcp" -> 8199)
                        internal_match = re.search(r'^(\d+)/', internal_part)
                        internal_port = int(internal_match.group(1)) if internal_match else None
                        
                        # Extract protocol (tcp/udp)
                        protocol_match = re.search(r'/(\w+)$', internal_part)
                        protocol = protocol_match.group(1) if protocol_match else 'tcp'
                        
                        if external_port and internal_port:
                            # Determine service type and URLs
                            service_name, prod_url, dev_url = determine_service_info(
                                container_name, external_port, internal_port, image
                            )
                            
                            scanned_ports.append({
                                'container_name': container_name,
                                'container_id': container_id[:12],  # Shortened ID
                                'image': image,
                                'external_port': external_port,
                                'internal_port': internal_port,
                                'protocol': protocol,
                                'service_name': service_name,
                                'prod_url': prod_url,
                                'dev_url': dev_url,
                                'description': f"Auto-scanned from {container_name} ({image})"
                            })
        
        return scanned_ports
        
    except subprocess.TimeoutExpired:
        raise Exception("Docker scan timeout - Docker may be unresponsive")
    except FileNotFoundError:
        raise Exception("Docker command not found - Docker may not be installed")
    except Exception as e:
        raise Exception(f"Docker scan failed: {str(e)}")


def determine_service_info(container_name: str, external_port: int, internal_port: int, image: str) -> tuple[str, Optional[str], Optional[str]]:
    """Determine service type and generate URLs based on container info."""
    container_name = container_name.lower()
    image = image.lower()
    
    # Determine service name based on port patterns and container info
    service_name = "unknown"
    prod_url = None
    dev_url = None
    
    # Web services (common web ports)
    if internal_port in [80, 443, 8080, 8000, 3000, 4200, 5000, 8199, 9652]:
        service_name = "web"
        base_url = f"http://localhost:{external_port}"
        if external_port in [80, 443] or 'prod' in container_name:
            prod_url = base_url
        else:
            dev_url = base_url
    
    # Database services
    elif internal_port == 3306 or 'mysql' in container_name or 'mysql' in image:
        service_name = "mysql"
    elif internal_port == 5432 or 'postgres' in container_name or 'postgres' in image:
        service_name = "postgresql"
    elif internal_port == 6379 or 'redis' in container_name or 'redis' in image:
        service_name = "redis"
    elif internal_port == 27017 or 'mongo' in container_name or 'mongo' in image:
        service_name = "mongodb"
    
    # API services
    elif 'api' in container_name or internal_port in [8001, 8002, 8080, 9000]:
        service_name = "api"
        dev_url = f"http://localhost:{external_port}"
    
    # Development tools
    elif 'phpmyadmin' in container_name or 'phpmyadmin' in image:
        service_name = "phpmyadmin"
        dev_url = f"http://localhost:{external_port}"
    
    # TaskMaster specific
    elif 'taskmaster' in container_name:
        if external_port == 8199:
            service_name = "taskmaster-app"
            dev_url = f"http://localhost:{external_port}"
        elif external_port == 9652:
            service_name = "taskmaster-hub"
            dev_url = f"http://localhost:{external_port}"
    
    return service_name, prod_url, dev_url


@app.post("/api/docker/scan", response_class=JSONResponse)
def scan_docker_ports(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Scan Docker containers and return discoverable port information."""
    try:
        scanned_ports = scan_docker_containers()
        
        return {
            "ok": True,
            "scanned_ports": scanned_ports,
            "total_found": len(scanned_ports),
            "message": f"Successfully scanned {len(scanned_ports)} port mappings from Docker containers"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docker scan failed: {str(e)}")


@app.post("/api/docker/import", response_class=JSONResponse)
def import_docker_ports(project_id: Optional[int] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Scan Docker containers and automatically import ports to the database."""
    try:
        scanned_ports = scan_docker_containers()
        
        if not scanned_ports:
            return {
                "ok": True,
                "imported": 0,
                "skipped": 0,
                "message": "No Docker containers with port mappings found"
            }
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        # If no specific project_id, try to find or create a default Docker project
        if project_id is None:
            docker_project = get_project_by_slug(db, "docker-scanned")
            if not docker_project:
                # Create a default project for Docker scanned ports
                docker_project_data = ProjectCreate(
                    slug="docker-scanned",
                    name="Docker Scanned Containers",
                    path="/projects/docker-scanned",
                    description="Auto-discovered Docker container ports"
                )
                docker_project = create_project(db, docker_project_data)
            project_id = docker_project.id
        
        # Import each scanned port
        for port_info in scanned_ports:
            try:
                # Check if port already exists for this project
                existing_ports = get_ports_by_project(db, project_id)
                port_exists = any(p.port == port_info['external_port'] for p in existing_ports)
                
                if not port_exists:
                    port_data = PortCreate(
                        project_id=project_id,
                        port=port_info['external_port'],
                        internal_port=port_info['internal_port'],
                        service_name=port_info['service_name'],
                        protocol=port_info['protocol'],
                        description=port_info['description']
                    )
                    create_port(db, port_data)
                    imported_count += 1
                else:
                    skipped_count += 1
                    
            except Exception as e:
                errors.append(f"Failed to import port {port_info['external_port']}: {str(e)}")
                skipped_count += 1
        
        result = {
            "ok": True,
            "imported": imported_count,
            "skipped": skipped_count,
            "total_scanned": len(scanned_ports),
            "project_id": project_id
        }
        
        if errors:
            result["errors"] = errors
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Docker import failed: {str(e)}")


# ============================================================================
# Project Configuration Endpoints (SonarQube, GitHub, Jenkins tokens)
# ============================================================================

@app.get("/api/projects/{project_id}/config", response_model=ProjectConfigResponse)
async def get_project_configuration(project_id: int, db: Session = Depends(get_db)):
    """Get project configuration including token status"""
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    config = get_or_create_project_config(db, project_id)
    return ProjectConfigResponse(**config.to_dict())

@app.post("/api/projects/{project_id}/config", response_model=ProjectConfigResponse) 
async def create_project_configuration(
    project_id: int, 
    config_data: ProjectConfigCreate,
    db: Session = Depends(get_db)
):
    """Create project configuration with tokens"""
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if config already exists
    existing_config = get_project_config(db, project_id)
    if existing_config:
        raise HTTPException(status_code=400, detail="Project configuration already exists")
    
    config_data.project_id = project_id
    config = create_project_config(db, config_data)
    return ProjectConfigResponse(**config.to_dict())

@app.patch("/api/projects/{project_id}/config", response_model=ProjectConfigResponse)
async def update_project_configuration(
    project_id: int,
    config_update: ProjectConfigUpdate,
    db: Session = Depends(get_db)
):
    """Update project configuration including tokens"""
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    config = update_project_config(db, project_id, config_update)
    if not config:
        # If config doesn't exist, create it
        config_data = ProjectConfigCreate(project_id=project_id, **config_update.dict(exclude_unset=True))
        config = create_project_config(db, config_data)
    
    return ProjectConfigResponse(**config.to_dict())

@app.delete("/api/projects/{project_id}/config")
async def delete_project_configuration(project_id: int, db: Session = Depends(get_db)):
    """Delete project configuration"""
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    success = delete_project_config(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project configuration not found")
    
    return {"message": "Project configuration deleted successfully"}

# ============================================================================
# SonarQube Integration Endpoints
# ============================================================================

@app.get("/api/sonarqube/status")
async def get_sonarqube_status():
    """Check SonarQube server status"""
    # Use a generic SonarQube manager for status checks
    sonarqube = SonarQubeManager()
    return sonarqube.check_sonarqube_status()

@app.post("/api/projects/{project_id}/analyze")
async def run_code_analysis(project_id: int, db: Session = Depends(get_db)):
    """Run SonarQube analysis for a project"""
    # Get project details
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Use container path directly - we're running inside Docker
    project_path = project.path
    if project_path.startswith("/projects/"):
        # Use container path as-is
        actual_path = project_path
    else:
        # Handle legacy paths by assuming they're in /projects
        actual_path = f"/projects/{project.slug}"
    
    # Check if project path exists in container
    if not os.path.exists(actual_path):
        raise HTTPException(status_code=400, detail=f"Project path not found: {actual_path}")
    
    # Generate project key for SonarQube
    project_key = f"tm-{project.slug}".replace("/", "").replace(" ", "-").lower()
    
    # Run analysis
    result = sonarqube.run_analysis(actual_path, project_key, project.name)
    
    # Store analysis timestamp in database (optional enhancement)
    # You could add a last_analysis column to Project model
    
    return result

@app.get("/api/projects/{project_id}/sonarqube-metrics")
async def get_project_sonarqube_metrics(project_id: int, db: Session = Depends(get_db)):
    """Get SonarQube metrics for a project"""
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get project configuration (creates default if not exists)
    config = get_or_create_project_config(db, project_id)
    
    # Check if SonarQube is enabled for this project
    if not config.sonarqube_enabled:
        return {
            "project_name": project.name,
            "project_slug": project.slug,
            "error": "SonarQube analysis is not enabled for this project",
            "status": "disabled"
        }
    
    # Check if token is configured
    if not config.sonarqube_token:
        return {
            "project_name": project.name,
            "project_slug": project.slug,
            "error": "SonarQube token is not configured for this project",
            "status": "not_configured"
        }
    
    # Generate project key (use configured key or generate from slug)
    project_key = config.sonarqube_project_key or f"tm-{project.slug}".replace("/", "").replace(" ", "-").lower()
    
    # Create project-specific SonarQube manager
    project_config_dict = {
        'sonarqube_token': config.sonarqube_token,
        'sonarqube_url': config.sonarqube_url or "http://atlas_sonarqube:9000"
    }
    sonarqube = SonarQubeManager(project_config=project_config_dict)
    
    # Get metrics from SonarQube
    metrics = sonarqube.get_project_metrics(project_key)
    
    # Add project info
    metrics["project_name"] = project.name
    metrics["project_slug"] = project.slug
    metrics["sonarqube_url"] = sonarqube.get_project_url(project_key)
    metrics["sonarqube_project_key"] = project_key
    
    return metrics

@app.get("/api/projects/{project_id}/sonarqube-url")
async def get_project_sonarqube_url(project_id: int, db: Session = Depends(get_db)):
    """Get SonarQube dashboard URL for a project"""
    project = get_project_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_key = f"tm-{project.slug}".replace("/", "").replace(" ", "-").lower()
    
    return {
        "project_name": project.name,
        "project_key": project_key,
        "sonarqube_url": sonarqube.get_project_url(project_key)
    }
