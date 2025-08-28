#!/usr/bin/env python3
"""
Fix Logrefine Path Configuration Issue

This script fixes the database path configuration for the Logrefine project
by updating the project path from '/projects/fortigatelog' to '/workspace'
where the actual task data is located.

Root Cause: Database entry points to wrong path, causing TaskStorage to look
for tasks in /projects/fortigatelog/.taskmaster/tasks/tasks.json instead of
/workspace/logrefine-tasks.json where the actual data exists.
"""

import os
import sys
from pathlib import Path

# Add the app directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent / "app"))

try:
    from database import get_db, get_project_by_slug, update_project, ProjectUpdate
except ImportError:
    print("❌ Error: Cannot import database modules.")
    print("   Make sure you're running this from the TaskMasterWeb project root.")
    print("   And that the database is properly initialized.")
    sys.exit(1)

def fix_logrefine_path():
    """Fix the Logrefine project path configuration in the database."""
    
    print("🔧 TaskMaster Logrefine Path Fix")
    print("=" * 50)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Find the Logrefine project
        print("🔍 Looking for Logrefine project in database...")
        project = get_project_by_slug(db, "logrefine")
        
        if not project:
            print("❌ Logrefine project not found in database!")
            print("   Available projects can be checked via /api/projects endpoint")
            return False
            
        print(f"✅ Found Logrefine project:")
        print(f"   - ID: {project.id}")
        print(f"   - Name: {project.name}")
        print(f"   - Current Path: {project.path}")
        print(f"   - Active: {project.active}")
        
        # Check if path is already correct
        if project.path == "/workspace":
            print("✅ Path is already correct! No changes needed.")
            return True
            
        # Verify the current path issue
        if project.path == "/projects/fortigatelog":
            print("🎯 Confirmed: Path points to /projects/fortigatelog (incorrect)")
        else:
            print(f"⚠️  Unexpected current path: {project.path}")
            
        # Check if the actual task file exists in workspace
        logrefine_tasks_file = Path("logrefine-tasks.json")
        if logrefine_tasks_file.exists():
            print(f"✅ Task data file found: {logrefine_tasks_file.absolute()}")
            
            # Read and validate the task file
            import json
            try:
                with open(logrefine_tasks_file, 'r', encoding='utf-8') as f:
                    task_data = json.load(f)
                    
                task_count = len(task_data.get("master", {}).get("tasks", []))
                print(f"   - Contains {task_count} tasks")
                print(f"   - Has master tag: {'master' in task_data}")
                
            except Exception as e:
                print(f"⚠️  Warning: Could not validate task file: {e}")
        else:
            print(f"❌ Task data file not found: {logrefine_tasks_file.absolute()}")
            print("   This may cause issues even after path fix.")
            
        # Confirm the fix with user
        print("\n🔄 Proposed Fix:")
        print(f"   Update path: '{project.path}' → '/workspace'")
        
        confirm = input("\n❓ Apply this fix? (y/N): ").strip().lower()
        if confirm != 'y':
            print("❌ Fix cancelled by user")
            return False
            
        # Apply the fix
        print("\n🔧 Applying fix...")
        
        project_update = ProjectUpdate(path="/workspace")
        updated_project = update_project(db, project.id, project_update)
        
        if updated_project:
            print("✅ Successfully updated Logrefine project path!")
            print(f"   - New Path: {updated_project.path}")
            print(f"   - Updated At: {updated_project.updated_at}")
            
            print("\n🔄 Next Steps:")
            print("   1. Restart Docker containers: docker compose restart")
            print("   2. Test Logrefine access: http://localhost:8199/logrefine")
            print("   3. Verify /logrefine/info endpoint returns task data")
            
            return True
        else:
            print("❌ Failed to update project path!")
            return False
            
    except Exception as e:
        print(f"❌ Error during fix: {e}")
        import traceback
        print(traceback.format_exc())
        return False
    finally:
        db.close()

def verify_fix():
    """Verify that the fix was applied successfully."""
    
    print("\n🔍 Verifying Fix...")
    print("-" * 30)
    
    db = next(get_db())
    try:
        project = get_project_by_slug(db, "logrefine")
        if not project:
            print("❌ Logrefine project not found!")
            return False
            
        print(f"✅ Current Path: {project.path}")
        
        if project.path == "/workspace":
            print("✅ Path fix verified successfully!")
            
            # Check task file accessibility
            task_file = Path("logrefine-tasks.json")
            if task_file.exists():
                print("✅ Task data file accessible")
                return True
            else:
                print("⚠️  Task data file not found in workspace")
                return False
        else:
            print(f"❌ Path still incorrect: {project.path}")
            return False
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("TaskMaster Logrefine Path Fix Utility")
    print("=====================================")
    print()
    
    # Check if we're in the right directory
    if not Path("logrefine-tasks.json").exists():
        print("❌ Error: logrefine-tasks.json not found in current directory!")
        print("   Please run this script from the TaskMasterWeb project root.")
        sys.exit(1)
        
    success = fix_logrefine_path()
    
    if success:
        print("\n" + "=" * 50)
        print("✅ LOGREFINE PATH FIX COMPLETED SUCCESSFULLY!")
        print("=" * 50)
        
        # Verify the fix
        if verify_fix():
            print("\n🎉 Fix verified! Logrefine should now work correctly.")
            print("\nRestart containers and test: http://localhost:8199/logrefine")
        else:
            print("\n⚠️  Fix applied but verification failed.")
            
    else:
        print("\n" + "=" * 50)
        print("❌ LOGREFINE PATH FIX FAILED!")
        print("=" * 50)
        print("\nPlease check the error messages above and try again.")
        sys.exit(1)