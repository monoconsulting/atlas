#!/usr/bin/env python3
"""
Migration script to update project paths to container format (/projects/...).
Part of Task 2 - Docker & Environment De-ambiguation
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal, Project

def migrate_project_paths():
    """Migrate all project paths to use container format."""
    db = SessionLocal()
    updated_count = 0
    
    try:
        projects = db.query(Project).all()
        
        for project in projects:
            original_path = project.path
            new_path = original_path
            
            # Convert various path formats to container paths
            if not original_path.startswith('/projects/'):
                if original_path.startswith('E:\\projects\\') or original_path.startswith('E:/projects/'):
                    # Convert Windows host path to container path
                    project_name = original_path.replace('E:\\projects\\', '').replace('E:/projects/', '').replace('\\', '/')
                    new_path = f'/projects/{project_name}'
                elif original_path.startswith('/workspace'):
                    # Convert old workspace path to projects path
                    new_path = original_path.replace('/workspace', '/projects/taskmasterweb')
                elif '\\' in original_path or original_path.startswith(('C:', 'D:', 'E:')):
                    # Likely a Windows path, extract project name
                    parts = original_path.replace('\\', '/').split('/')
                    project_name = parts[-1] if parts else project.slug
                    new_path = f'/projects/{project_name}'
                else:
                    # Unknown format, use slug as project name
                    new_path = f'/projects/{project.slug}'
            
            if new_path != original_path:
                print(f"Updating project '{project.name}' (ID: {project.id}):")
                print(f"  Old path: {original_path}")
                print(f"  New path: {new_path}")
                project.path = new_path
                updated_count += 1
        
        if updated_count > 0:
            db.commit()
            print(f"\nSuccessfully updated {updated_count} project(s) to use container paths.")
        else:
            print("All projects already using container paths. No updates needed.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
        return False
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    print("Starting project path migration...")
    print("=" * 50)
    
    if migrate_project_paths():
        print("\nMigration completed successfully!")
    else:
        print("\nMigration failed. Please check the error messages above.")
        sys.exit(1)