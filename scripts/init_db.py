#!/usr/bin/env python3
"""
Database initialization script for TaskMasterWeb.

This script creates the database tables and optionally seeds initial data.
Run this after starting the MySQL container.
"""

import os
import sys
import time
from pathlib import Path

# Add app directory to path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from database import init_db, engine, SessionLocal, create_project, ProjectCreate
from sqlalchemy import text
from sqlalchemy.exc import OperationalError


def wait_for_db(max_retries=30, delay=2):
    """Wait for database to be available."""
    print("Waiting for database to be available...")
    
    for attempt in range(max_retries):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print("Database is ready!")
            return True
        except OperationalError as e:
            print(f"Attempt {attempt + 1}/{max_retries}: Database not ready yet... ({e})")
            time.sleep(delay)
    
    print("ERROR: Database did not become available within the timeout period")
    return False


def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    try:
        init_db()
        print("✅ Database tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False


def seed_initial_data():
    """Seed the database with initial project data."""
    print("Seeding initial data...")
    
    db = SessionLocal()
    try:
        # Check if we already have projects
        existing_projects = db.execute(text("SELECT COUNT(*) FROM projects")).scalar()
        if existing_projects > 0:
            print(f"Database already has {existing_projects} projects. Skipping seed data.")
            return True
        
        # Add the current project as the default project
        current_project_path = os.getenv("PROJECT_ROOT", "/workspace")
        project_name = os.getenv("PROJECT_NAME", "TaskMaster Web")
        
        default_project = ProjectCreate(
            slug="default",
            name=project_name,
            path=current_project_path,
            description="Default TaskMaster project",
            active=True
        )
        
        created_project = create_project(db, default_project)
        print(f"✅ Created default project: {created_project.name} (/{created_project.slug})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        return False
    finally:
        db.close()


def main():
    """Main initialization function."""
    print("🚀 TaskMasterWeb Database Initialization")
    print("=" * 50)
    
    # Wait for database to be available
    if not wait_for_db():
        sys.exit(1)
    
    # Create tables
    if not create_tables():
        sys.exit(1)
    
    # Seed initial data
    if not seed_initial_data():
        sys.exit(1)
    
    print("\n✅ Database initialization completed successfully!")
    print(f"Database URL: {os.getenv('DATABASE_URL', 'Not set')}")


if __name__ == "__main__":
    main()