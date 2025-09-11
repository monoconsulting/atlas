"""
Database models and connection setup for Atlas multi-project support.
"""

from __future__ import annotations
import os
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    JSON,
    UniqueConstraint,
    Index,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel, validator
from cryptography.fernet import Fernet

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+mysqlconnector://tmuser:tmpassword@mysql:3306/taskmaster"
)

# SQLAlchemy setup: MySQL only
engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Encryption key for sensitive data (SonarQube tokens)
# In production, this should be from environment or a secure key store
ENCRYPTION_KEY = os.getenv("ATLAS_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a new key if not set (for development only)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    
cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)


class Project(Base):
    """SQLAlchemy model for projects."""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    path = Column(String(500), nullable=False)
    task_file_path = Column(String(500), nullable=True)  # Path to tasks.json file
    description = Column(Text, nullable=True)
    
    # URL fields for different environments
    prod_url = Column(String(500), nullable=True)  # Production URL
    dev_url = Column(String(500), nullable=True)   # Development URL  
    docs_url = Column(String(500), nullable=True)  # Documentation URL
    phpmyadmin_url = Column(String(500), nullable=True)  # phpMyAdmin URL
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    active = Column(Boolean, default=True)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "path": self.path,
            "task_file_path": self.task_file_path,
            "description": self.description,
            "prod_url": self.prod_url,
            "dev_url": self.dev_url,
            "docs_url": self.docs_url,
            "phpmyadmin_url": self.phpmyadmin_url,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "active": self.active
        }


# New ORM models for tasks/subtasks (parallel DB mirror of tasks.json)
class Task(Base):
    """Relational representation of a Taskmaster task.

    Uniqueness is enforced per (project_id, tag, local_id) to mirror JSON id scope.
    """

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    tag = Column(String(100), nullable=False, index=True)
    local_id = Column(Integer, nullable=False)  # ID within tag scope

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    prompt = Column(Text, nullable=True)  # MEDIUMTEXT not portable; Text is fine for SQLAlchemy

    status = Column(String(32), nullable=False, default="todo")
    priority = Column(String(16), nullable=False, default="medium")
    due_date = Column(Date, nullable=True)
    assigned_to = Column(String(255), nullable=True)
    estimate = Column(String(64), nullable=True)

    labels_json = Column(JSON, nullable=True)
    dependencies_json = Column(JSON, nullable=True)

    deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", backref="task_items")

    __table_args__ = (
        UniqueConstraint("project_id", "tag", "local_id", name="uq_task_project_tag_localid"),
        Index("ix_tasks_project_tag_status", "project_id", "tag", "status"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "tag": self.tag,
            "local_id": self.local_id,
            "title": self.title,
            "description": self.description,
            "prompt": self.prompt,
            "status": self.status,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "assigned_to": self.assigned_to,
            "estimate": self.estimate,
            "labels": self.labels_json or [],
            "dependencies": self.dependencies_json or [],
            "deleted": self.deleted,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }


class SubTask(Base):
    """Relational representation of a Taskmaster subtask."""

    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    local_id = Column(Integer, nullable=False)  # sub-id within parent task (usually 1..8)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    prompt = Column(Text, nullable=True)

    status = Column(String(32), nullable=False, default="todo")
    priority = Column(String(16), nullable=False, default="medium")
    due_date = Column(Date, nullable=True)
    assigned_to = Column(String(255), nullable=True)
    estimate = Column(String(64), nullable=True)

    labels_json = Column(JSON, nullable=True)
    dependencies_json = Column(JSON, nullable=True)

    deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task = relationship("Task", backref="subtask_items")

    __table_args__ = (
        UniqueConstraint("task_id", "local_id", name="uq_subtask_task_localid"),
        Index("ix_subtasks_task_status", "task_id", "status"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "task_id": self.task_id,
            "local_id": self.local_id,
            "title": self.title,
            "description": self.description,
            "prompt": self.prompt,
            "status": self.status,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "assigned_to": self.assigned_to,
            "estimate": self.estimate,
            "labels": self.labels_json or [],
            "dependencies": self.dependencies_json or [],
            "deleted": self.deleted,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }


class Port(Base):
    """SQLAlchemy model for project ports."""
    __tablename__ = "ports"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    port = Column(Integer, nullable=False)  # External port (e.g., 33306 from 33306:3306)
    internal_port = Column(Integer, nullable=True)  # Internal port (e.g., 3306 from 33306:3306)
    service_name = Column(String(100), nullable=True)  # e.g., "mysql", "web", "api"
    description = Column(String(255), nullable=True)  # Port description
    protocol = Column(String(10), default="tcp")  # tcp, udp, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    active = Column(Boolean, default=True)
    
    # Relationship
    project = relationship("Project", backref="ports")
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "port": self.port,
            "internal_port": self.internal_port,
            "service_name": self.service_name,
            "description": self.description,
            "protocol": self.protocol,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "active": self.active,
            "project_name": self.project.name if self.project else None,
            "project_slug": self.project.slug if self.project else None
        }


class ProjectConfig(Base):
    """SQLAlchemy model for project-specific configuration including SonarQube tokens."""
    __tablename__ = "project_configs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True, unique=True)
    
    # SonarQube configuration
    sonarqube_url = Column(String(500), nullable=True, default="http://atlas_sonarqube:9000")
    sonarqube_token_encrypted = Column(Text, nullable=True)  # Encrypted token storage
    sonarqube_token_name = Column(String(255), nullable=True)  # Token name for reference
    sonarqube_project_key = Column(String(255), nullable=True)  # SonarQube project key
    sonarqube_enabled = Column(Boolean, default=False)
    
    # Additional integration tokens (future expansion)
    github_token_encrypted = Column(Text, nullable=True)
    jenkins_token_encrypted = Column(Text, nullable=True) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    project = relationship("Project", backref="config", uselist=False)
    
    def encrypt_token(self, token: str) -> str:
        """Encrypt a token for secure storage."""
        if not token:
            return None
        return cipher_suite.encrypt(token.encode()).decode()
    
    def decrypt_token(self, encrypted_token: str) -> str:
        """Decrypt a token for use."""
        if not encrypted_token:
            return None
        try:
            return cipher_suite.decrypt(encrypted_token.encode()).decode()
        except Exception:
            return None
    
    @property
    def sonarqube_token(self) -> Optional[str]:
        """Get decrypted SonarQube token."""
        return self.decrypt_token(self.sonarqube_token_encrypted)
    
    @sonarqube_token.setter
    def sonarqube_token(self, token: str):
        """Set encrypted SonarQube token."""
        self.sonarqube_token_encrypted = self.encrypt_token(token)
    
    @property
    def github_token(self) -> Optional[str]:
        """Get decrypted GitHub token."""
        return self.decrypt_token(self.github_token_encrypted)
    
    @github_token.setter
    def github_token(self, token: str):
        """Set encrypted GitHub token."""
        self.github_token_encrypted = self.encrypt_token(token)
    
    @property
    def jenkins_token(self) -> Optional[str]:
        """Get decrypted Jenkins token."""
        return self.decrypt_token(self.jenkins_token_encrypted)
    
    @jenkins_token.setter
    def jenkins_token(self, token: str):
        """Set encrypted Jenkins token."""
        self.jenkins_token_encrypted = self.encrypt_token(token)
    
    def to_dict(self, include_tokens: bool = False) -> dict:
        """Convert to dictionary for API responses."""
        data = {
            "id": self.id,
            "project_id": self.project_id,
            "sonarqube_url": self.sonarqube_url,
            "sonarqube_token_name": self.sonarqube_token_name,
            "sonarqube_project_key": self.sonarqube_project_key,
            "sonarqube_enabled": self.sonarqube_enabled,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
        
        # Only include actual tokens if explicitly requested (for admin use)
        if include_tokens:
            data.update({
                "sonarqube_token": self.sonarqube_token,
                "github_token": self.github_token,
                "jenkins_token": self.jenkins_token,
            })
        else:
            # Include token status without revealing the actual token
            data.update({
                "sonarqube_token_configured": bool(self.sonarqube_token_encrypted),
                "github_token_configured": bool(self.github_token_encrypted),
                "jenkins_token_configured": bool(self.jenkins_token_encrypted),
            })
        
        return data


# Pydantic models for API requests/responses
class ProjectCreate(BaseModel):
    """Pydantic model for creating a project."""
    slug: str
    name: str
    path: str
    task_file_path: Optional[str] = None
    description: Optional[str] = None
    prod_url: Optional[str] = None
    dev_url: Optional[str] = None
    docs_url: Optional[str] = None
    phpmyadmin_url: Optional[str] = None
    active: bool = True
    
    @validator('slug')
    def clean_slug(cls, v):
        """Remove leading slashes from slug to prevent URL issues."""
        if v:
            return v.lstrip('/')
        return v
    
    @validator('path')
    def validate_container_path(cls, v):
        """Ensure paths use container format starting with /projects/."""
        if v and not v.startswith('/projects/'):
            # Auto-convert common patterns to container paths
            if v.startswith('E:\\projects\\') or v.startswith('E:/projects/'):
                # Convert Windows host path to container path
                project_name = v.replace('E:\\projects\\', '').replace('E:/projects/', '').replace('\\', '/')
                return f'/projects/{project_name}'
            elif '\\' in v or v.startswith('C:') or v.startswith('D:') or v.startswith('E:'):
                # Likely a Windows path, extract project name
                parts = v.replace('\\', '/').split('/')
                project_name = parts[-1] if parts else 'unknown'
                return f'/projects/{project_name}'
            # If not a recognized pattern, prepend /projects/
            return f'/projects/{v.lstrip("/")}'
        return v


class ProjectUpdate(BaseModel):
    """Pydantic model for updating a project."""
    slug: Optional[str] = None
    name: Optional[str] = None
    path: Optional[str] = None
    task_file_path: Optional[str] = None
    description: Optional[str] = None
    prod_url: Optional[str] = None
    dev_url: Optional[str] = None
    docs_url: Optional[str] = None
    phpmyadmin_url: Optional[str] = None
    active: Optional[bool] = None
    
    @validator('slug')
    def clean_slug(cls, v):
        """Remove leading slashes from slug to prevent URL issues."""
        if v:
            return v.lstrip('/')
        return v
    
    @validator('path')
    def validate_container_path(cls, v):
        """Ensure paths use container format starting with /projects/."""
        if v and not v.startswith('/projects/'):
            # Auto-convert common patterns to container paths
            if v.startswith('E:\\projects\\') or v.startswith('E:/projects/'):
                # Convert Windows host path to container path
                project_name = v.replace('E:\\projects\\', '').replace('E:/projects/', '').replace('\\', '/')
                return f'/projects/{project_name}'
            elif '\\' in v or v.startswith('C:') or v.startswith('D:') or v.startswith('E:'):
                # Likely a Windows path, extract project name
                parts = v.replace('\\', '/').split('/')
                project_name = parts[-1] if parts else 'unknown'
                return f'/projects/{project_name}'
            # If not a recognized pattern, prepend /projects/
            return f'/projects/{v.lstrip("/")}'
        return v


class ProjectResponse(BaseModel):
    """Pydantic model for project API responses."""
    id: int
    slug: str
    name: str
    path: str
    task_file_path: Optional[str]
    description: Optional[str]
    prod_url: Optional[str]
    dev_url: Optional[str]
    docs_url: Optional[str]
    phpmyadmin_url: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]
    active: bool


# Port Pydantic models
class PortCreate(BaseModel):
    """Pydantic model for creating a port."""
    project_id: int
    port: int
    internal_port: Optional[int] = None
    service_name: Optional[str] = None
    description: Optional[str] = None
    protocol: str = "tcp"
    active: bool = True


class PortUpdate(BaseModel):
    """Pydantic model for updating a port."""
    project_id: Optional[int] = None
    port: Optional[int] = None
    internal_port: Optional[int] = None
    service_name: Optional[str] = None
    description: Optional[str] = None
    protocol: Optional[str] = None
    active: Optional[bool] = None


class PortResponse(BaseModel):
    """Pydantic model for port API responses."""
    id: int
    project_id: int
    port: int
    internal_port: Optional[int]
    service_name: Optional[str]
    description: Optional[str]
    protocol: str
    created_at: Optional[str]
    updated_at: Optional[str]
    active: bool
    project_name: Optional[str]
    project_slug: Optional[str]


# ProjectConfig Pydantic models
class ProjectConfigCreate(BaseModel):
    """Pydantic model for creating project configuration."""
    project_id: int
    sonarqube_url: Optional[str] = "http://atlas_sonarqube:9000"
    sonarqube_token: Optional[str] = None
    sonarqube_token_name: Optional[str] = None
    sonarqube_project_key: Optional[str] = None
    sonarqube_enabled: bool = False
    github_token: Optional[str] = None
    jenkins_token: Optional[str] = None


class ProjectConfigUpdate(BaseModel):
    """Pydantic model for updating project configuration."""
    sonarqube_url: Optional[str] = None
    sonarqube_token: Optional[str] = None
    sonarqube_token_name: Optional[str] = None
    sonarqube_project_key: Optional[str] = None
    sonarqube_enabled: Optional[bool] = None
    github_token: Optional[str] = None
    jenkins_token: Optional[str] = None


class ProjectConfigResponse(BaseModel):
    """Pydantic model for project configuration API responses."""
    id: int
    project_id: int
    sonarqube_url: Optional[str]
    sonarqube_token_name: Optional[str]
    sonarqube_project_key: Optional[str]
    sonarqube_enabled: bool
    sonarqube_token_configured: bool
    github_token_configured: bool
    jenkins_token_configured: bool
    created_at: Optional[str]
    updated_at: Optional[str]


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


# ---- Task/Subtask CRUD helpers ----

def _parse_date_str(date_str: str | None):
    if not date_str:
        return None
    try:
        # Expecting YYYY-MM-DD
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None


def get_task_row(db, project_id: int, tag: str, local_id: int) -> Optional[Task]:
    return (
        db.query(Task)
        .filter(Task.project_id == project_id, Task.tag == tag, Task.local_id == local_id)
        .first()
    )


def upsert_task_row(db, project_id: int, tag: str, task_dict: dict) -> Task:
    local_id = int(task_dict.get("id"))
    row = get_task_row(db, project_id, tag, local_id)
    now = datetime.utcnow()
    if row is None:
        row = Task(project_id=project_id, tag=tag, local_id=local_id, created_at=now, updated_at=now)
        db.add(row)

    row.title = task_dict.get("title") or ""
    row.description = task_dict.get("description") or None
    row.prompt = task_dict.get("prompt") or None
    row.status = task_dict.get("status") or "todo"
    row.priority = task_dict.get("priority") or "medium"
    row.due_date = _parse_date_str(task_dict.get("due_date"))
    row.assigned_to = task_dict.get("assigned_to") or None
    row.estimate = task_dict.get("estimate") or None
    row.labels_json = task_dict.get("labels") or []
    # dependencies or relations
    deps = task_dict.get("dependencies")
    if not deps:
        deps = task_dict.get("relations")
    row.dependencies_json = deps or []
    row.deleted = bool(task_dict.get("deleted", False))
    row.updated_at = now

    db.flush()
    return row


def get_subtask_row(db, task_id: int, local_id: int) -> Optional[SubTask]:
    return (
        db.query(SubTask)
        .filter(SubTask.task_id == task_id, SubTask.local_id == local_id)
        .first()
    )


def upsert_subtask_row(db, task_pk: int, sub_dict: dict) -> SubTask:
    local_id = int(sub_dict.get("id"))
    row = get_subtask_row(db, task_pk, local_id)
    now = datetime.utcnow()
    if row is None:
        row = SubTask(task_id=task_pk, local_id=local_id, created_at=now, updated_at=now)
        db.add(row)

    row.title = sub_dict.get("title") or ""
    row.description = sub_dict.get("description") or None
    row.prompt = sub_dict.get("prompt") or None
    row.status = sub_dict.get("status") or "todo"
    row.priority = sub_dict.get("priority") or "medium"
    row.due_date = _parse_date_str(sub_dict.get("due_date"))
    row.assigned_to = sub_dict.get("assigned_to") or None
    row.estimate = sub_dict.get("estimate") or None
    row.labels_json = sub_dict.get("labels") or []
    row.dependencies_json = sub_dict.get("dependencies") or []
    row.deleted = bool(sub_dict.get("deleted", False))
    row.updated_at = now

    db.flush()
    return row


def delete_task_soft(db, project_id: int, tag: str, local_id: int) -> bool:
    row = get_task_row(db, project_id, tag, local_id)
    if not row:
        return False
    row.deleted = True
    row.updated_at = datetime.utcnow()
    db.flush()
    return True


def delete_subtask_soft(db, task_pk: int, local_id: int) -> bool:
    row = get_subtask_row(db, task_pk, local_id)
    if not row:
        return False
    row.deleted = True
    row.updated_at = datetime.utcnow()
    db.flush()
    return True


def get_project_by_slug(db, slug: str) -> Optional[Project]:
    """Get project by slug."""
    return db.query(Project).filter(Project.slug == slug, Project.active == True).first()


def get_project_by_id(db, project_id: int) -> Optional[Project]:
    """Get project by ID."""
    return db.query(Project).filter(Project.id == project_id, Project.active == True).first()


def get_project_by_id_any_status(db, project_id: int) -> Optional[Project]:
    """Get project by ID regardless of active status."""
    return db.query(Project).filter(Project.id == project_id).first()


def get_all_projects(db) -> list[Project]:
    """Get all projects, including inactive (for admin visibility)."""
    # Admin needs to see disabled projects too; filter by active only where required elsewhere
    return db.query(Project).order_by(Project.name.asc()).all()


def create_project(db, project: ProjectCreate) -> Project:
    """Create a new project."""
    db_project = Project(
        slug=project.slug,
        name=project.name, 
        path=project.path,
        task_file_path=project.task_file_path,
        description=project.description,
        prod_url=project.prod_url,
        dev_url=project.dev_url,
        docs_url=project.docs_url,
        phpmyadmin_url=project.phpmyadmin_url,
        active=project.active
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project(db, project_id: int, project_update: ProjectUpdate) -> Optional[Project]:
    """Update an existing project."""
    db_project = get_project_by_id_any_status(db, project_id)
    if not db_project:
        return None
    
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_project, field, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project


def delete_project(db, project_id: int) -> bool:
    """Soft delete a project (mark as inactive)."""
    db_project = get_project_by_id(db, project_id)
    if not db_project:
        return False
    
    db_project.active = False
    db.commit()
    return True


# Port CRUD functions
def get_port_by_id(db, port_id: int) -> Optional[Port]:
    """Get port by ID."""
    return db.query(Port).filter(Port.id == port_id, Port.active == True).first()


def get_ports_by_project(db, project_id: int) -> list[Port]:
    """Get all active ports for a project."""
    return db.query(Port).filter(Port.project_id == project_id, Port.active == True).all()


def get_all_ports(db) -> list[Port]:
    """Get all active ports with project information."""
    return db.query(Port).join(Project).filter(Port.active == True, Project.active == True).all()


def create_port(db, port: PortCreate) -> Port:
    """Create a new port."""
    db_port = Port(
        project_id=port.project_id,
        port=port.port,
        internal_port=port.internal_port,
        service_name=port.service_name,
        description=port.description,
        protocol=port.protocol,
        active=port.active
    )
    db.add(db_port)
    db.commit()
    db.refresh(db_port)
    return db_port


def update_port(db, port_id: int, port_update: PortUpdate) -> Optional[Port]:
    """Update an existing port."""
    db_port = get_port_by_id(db, port_id)
    if not db_port:
        return None
    
    update_data = port_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_port, field, value)
    
    db.commit()
    db.refresh(db_port)
    return db_port


def delete_port(db, port_id: int) -> bool:
    """Soft delete a port (mark as inactive)."""
    db_port = get_port_by_id(db, port_id)
    if not db_port:
        return False
    
    db_port.active = False
    db.commit()
    return True


# ProjectConfig CRUD functions
def get_project_config(db, project_id: int) -> Optional[ProjectConfig]:
    """Get project configuration by project ID."""
    return db.query(ProjectConfig).filter(ProjectConfig.project_id == project_id).first()


def create_project_config(db, config: ProjectConfigCreate) -> ProjectConfig:
    """Create a new project configuration."""
    db_config = ProjectConfig(
        project_id=config.project_id,
        sonarqube_url=config.sonarqube_url,
        sonarqube_token_name=config.sonarqube_token_name,
        sonarqube_project_key=config.sonarqube_project_key,
        sonarqube_enabled=config.sonarqube_enabled
    )
    
    # Set encrypted tokens
    if config.sonarqube_token:
        db_config.sonarqube_token = config.sonarqube_token
    if config.github_token:
        db_config.github_token = config.github_token
    if config.jenkins_token:
        db_config.jenkins_token = config.jenkins_token
    
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


def update_project_config(db, project_id: int, config_update: ProjectConfigUpdate) -> Optional[ProjectConfig]:
    """Update project configuration."""
    db_config = get_project_config(db, project_id)
    if not db_config:
        return None
    
    # Update basic fields
    update_data = config_update.dict(exclude_unset=True, exclude={'sonarqube_token', 'github_token', 'jenkins_token'})
    for field, value in update_data.items():
        setattr(db_config, field, value)
    
    # Update encrypted tokens
    if config_update.sonarqube_token is not None:
        db_config.sonarqube_token = config_update.sonarqube_token
    if config_update.github_token is not None:
        db_config.github_token = config_update.github_token  
    if config_update.jenkins_token is not None:
        db_config.jenkins_token = config_update.jenkins_token
    
    db.commit()
    db.refresh(db_config)
    return db_config


def get_or_create_project_config(db, project_id: int) -> ProjectConfig:
    """Get existing project config or create a default one."""
    config = get_project_config(db, project_id)
    if not config:
        config_data = ProjectConfigCreate(project_id=project_id)
        config = create_project_config(db, config_data)
    return config


def delete_project_config(db, project_id: int) -> bool:
    """Delete project configuration (hard delete)."""
    db_config = get_project_config(db, project_id)
    if not db_config:
        return False
    
    db.delete(db_config)
    db.commit()
    return True
