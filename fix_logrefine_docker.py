#!/usr/bin/env python3
"""
Docker-based Logrefine Path Fix

This script fixes the Logrefine project path by directly executing SQL
commands in the MySQL Docker container using docker compose.
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(command, shell=True):
    """Run a command and return success status and output."""
    try:
        result = subprocess.run(
            command, 
            shell=shell, 
            capture_output=True, 
            text=True,
            cwd=Path.cwd()
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def check_docker_containers():
    """Check if Docker containers are running."""
    print("🔍 Checking Docker containers...")
    
    success, output, error = run_command("docker compose ps")
    if not success:
        print(f"❌ Error checking Docker containers: {error}")
        return False
        
    if "Up" not in output:
        print("❌ Docker containers are not running!")
        print("   Please start containers first: docker compose up -d")
        return False
        
    print("✅ Docker containers are running")
    return True

def get_mysql_container():
    """Get the MySQL container service name."""
    success, output, error = run_command("docker compose ps --services")
    if not success:
        print(f"❌ Error getting service list: {error}")
        return None
        
    services = output.strip().split('\n')
    mysql_service = None
    for service in services:
        if 'mysql' in service.lower():
            mysql_service = service
            break
            
    if not mysql_service:
        print("❌ MySQL service not found in docker-compose.yml")
        return None
        
    print(f"🔍 Found MySQL service: {mysql_service}")
    return mysql_service

def execute_sql_fix(mysql_service):
    """Execute the SQL fix in the MySQL container."""
    print("🔧 Applying database fix...")
    
    # SQL commands to fix the Logrefine path
    sql_commands = """
    SELECT CONCAT('BEFORE: ', slug, ' -> ', path) as status FROM projects WHERE slug = 'logrefine';
    
    UPDATE projects 
    SET path = '/workspace', updated_at = NOW()
    WHERE slug = 'logrefine' AND active = 1;
    
    SELECT CONCAT('AFTER: ', slug, ' -> ', path) as status FROM projects WHERE slug = 'logrefine';
    
    SELECT CONCAT('Rows affected: ', ROW_COUNT()) as result;
    """
    
    # Get environment variables for database connection
    mysql_password = os.getenv('MYSQL_ROOT_PASSWORD', 'rootpassword')
    mysql_database = os.getenv('MYSQL_DATABASE', 'taskmaster')
    
    # Build docker compose exec command
    docker_cmd = f"""docker compose exec {mysql_service} mysql -u root -p{mysql_password} -D {mysql_database} -e "{sql_commands}" """
    
    print(f"   Executing SQL commands in {mysql_service} container...")
    
    success, output, error = run_command(docker_cmd)
    
    if success:
        print("✅ SQL commands executed successfully!")
        print("\n📋 Database Update Results:")
        print(output)
        return True
    else:
        print(f"❌ SQL execution failed!")
        print(f"Error: {error}")
        return False

def main():
    """Main execution function."""
    print("🔧 TaskMaster Logrefine Docker Path Fix")
    print("======================================")
    print()
    
    # Check if we're in the right directory
    if not Path("logrefine-tasks.json").exists():
        print("❌ Error: logrefine-tasks.json not found in current directory!")
        print("   Please run this script from the TaskMasterWeb project root.")
        return False
    
    if not Path("docker-compose.yml").exists():
        print("❌ Error: docker-compose.yml not found!")
        print("   Please run this script from the project root with Docker Compose.")
        return False
        
    print("✅ Found required files (logrefine-tasks.json, docker-compose.yml)")
    print()
    
    # Check Docker containers
    if not check_docker_containers():
        return False
    print()
    
    # Get MySQL service name
    mysql_service = get_mysql_container()
    if not mysql_service:
        return False
    print()
    
    # Execute the SQL fix
    if not execute_sql_fix(mysql_service):
        return False
    
    print()
    print("🎉 LOGREFINE PATH FIX COMPLETED!")
    print("================================")
    print()
    print("🔄 Next Steps:")
    print("   1. Restart TaskMaster containers:")
    print("      docker compose restart taskmasterweb")
    print()
    print("   2. Test Logrefine access:")
    print("      http://localhost:8199/logrefine")
    print()
    print("   3. Verify task data loads:")
    print("      http://localhost:8199/logrefine/info")
    print()
    print("✅ The system should now find logrefine-tasks.json in /workspace")
    print("   instead of looking for tasks in /projects/fortigatelog")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)