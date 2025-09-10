#!/usr/bin/env python3
"""
Database migration script to remove project_root_path column
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
            # Check if column exists
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'projects' 
                AND TABLE_SCHEMA = DATABASE()
                AND COLUMN_NAME = 'project_root_path'
            """))
            columns = [row[0] for row in result]
            
            if 'project_root_path' in columns:
                print("Dropping project_root_path column...")
                conn.execute(text("ALTER TABLE projects DROP COLUMN project_root_path"))
                print("Dropped project_root_path column")
                conn.commit()
            else:
                print("project_root_path column does not exist")
                
        except Exception as e:
            print(f"MySQL migration error: {e}")
    else:
        # SQLite approach - SQLite doesn't support DROP COLUMN easily, so we'll skip for now
        print("SQLite detected - column dropping not implemented for SQLite")

print("Migration complete!")