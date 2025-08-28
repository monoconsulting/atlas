#!/usr/bin/env python3
"""
SQLite-specific migration script
"""

from sqlalchemy import create_engine, text
import os

# Use SQLite database
sqlite_url = "sqlite:///./taskmaster_local.db"
engine = create_engine(sqlite_url, echo=True)

print("Using SQLite database for migration")

# Run migration
with engine.connect() as conn:
    try:
        # Check if task_file_path column exists
        result = conn.execute(text("PRAGMA table_info(projects)"))
        columns = [row[1] for row in result]
        
        if 'task_file_path' not in columns:
            print("Adding task_file_path column...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN task_file_path VARCHAR(500)"))
            print("Added task_file_path column")
        else:
            print("task_file_path column already exists")
        
        conn.commit()
        print("SQLite migration completed")
        
    except Exception as e:
        print(f"SQLite migration error: {e}")

print("Migration complete!")