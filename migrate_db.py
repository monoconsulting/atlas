#!/usr/bin/env python3
"""
Database migration script to add task_file_path and project_root_path columns
"""

from sqlalchemy import create_engine, text
import os

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+mysqlconnector://tmuser:tmpassword@localhost:33066/taskmaster"
)

# Try MySQL first, fallback to SQLite
try:
    engine = create_engine(DATABASE_URL, echo=True)
    conn = engine.connect()
    conn.close()
    print(f"Using MySQL database")
except Exception as e:
    print(f"MySQL not available ({e}), using SQLite")
    sqlite_url = "sqlite:///./taskmaster_local.db"
    engine = create_engine(sqlite_url, echo=True)

# Run migration
with engine.connect() as conn:
    # Check if using MySQL or SQLite
    is_mysql = 'mysql' in str(engine.url)
    
    if is_mysql:
        # MySQL approach
        try:
            # Check existing columns
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'projects' 
                AND TABLE_SCHEMA = DATABASE()
            """))
            columns = [row[0] for row in result]
            
            if 'task_file_path' not in columns:
                print("Adding task_file_path column...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN task_file_path VARCHAR(500)"))
                print("Added task_file_path column")
            else:
                print("task_file_path column already exists")
                
            if 'project_root_path' not in columns:
                print("Adding project_root_path column...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN project_root_path VARCHAR(500)"))
                print("Added project_root_path column")
            else:
                print("project_root_path column already exists")
            
            conn.commit()
        except Exception as e:
            print(f"MySQL migration error: {e}")
    else:
        # SQLite approach
        try:
            result = conn.execute(text("PRAGMA table_info(projects)"))
            columns = [row[1] for row in result]
            
            if 'task_file_path' not in columns:
                print("Adding task_file_path column...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN task_file_path VARCHAR(500)"))
                print("Added task_file_path column")
            
            if 'project_root_path' not in columns:
                print("Adding project_root_path column...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN project_root_path VARCHAR(500)"))
                print("Added project_root_path column")
            
            conn.commit()
        except Exception as e:
            print(f"SQLite migration error: {e}")

print("Migration complete!")