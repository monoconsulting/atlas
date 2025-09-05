"""
Database models and connection setup for Atlas multi-project support.
"""

from __future__ import annotations
import os
from datetime import datetime
from typing import Optional

from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel, validator

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+mysqlconnector://tmuser:tmpassword@mysql:3306/taskmaster"
)

# SQLAlchemy setup: MySQL only
engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


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
