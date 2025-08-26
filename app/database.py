"""
Database models and connection setup for TaskMasterWeb multi-project support.
"""

from __future__ import annotations
import os
from datetime import datetime
from typing import Optional

from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+mysqlconnector://tmuser:tmpassword@mysql:3306/taskmaster"
)

# SQLAlchemy setup: be resilient in local dev where MySQL may not be available.
try:
    engine = create_engine(DATABASE_URL, echo=False)
    # Try a quick connect to validate the URL (will raise if host unknown)
    conn = engine.connect()
    conn.close()
except Exception:
    # Fallback to a lightweight local SQLite file for developer/testing environments.
    sqlite_url = os.getenv("TASKMASTER_SQLITE_URL", "sqlite:///./taskmaster_local.db")
    engine = create_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Project(Base):
    """SQLAlchemy model for projects."""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    path = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
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
            "description": self.description,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "active": self.active
        }


# Pydantic models for API requests/responses
class ProjectCreate(BaseModel):
    """Pydantic model for creating a project."""
    slug: str
    name: str
    path: str
    description: Optional[str] = None
    active: bool = True


class ProjectUpdate(BaseModel):
    """Pydantic model for updating a project."""
    slug: Optional[str] = None
    name: Optional[str] = None
    path: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class ProjectResponse(BaseModel):
    """Pydantic model for project API responses."""
    id: int
    slug: str
    name: str
    path: str
    description: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]
    active: bool


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


def get_all_projects(db) -> list[Project]:
    """Get all active projects."""
    return db.query(Project).filter(Project.active == True).all()


def create_project(db, project: ProjectCreate) -> Project:
    """Create a new project."""
    db_project = Project(
        slug=project.slug,
        name=project.name, 
        path=project.path,
        description=project.description,
        active=project.active
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def update_project(db, project_id: int, project_update: ProjectUpdate) -> Optional[Project]:
    """Update an existing project."""
    db_project = get_project_by_id(db, project_id)
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