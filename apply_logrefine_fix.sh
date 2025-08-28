#!/bin/bash

# Apply Logrefine Path Fix Script
# This script executes the SQL fix inside the MySQL Docker container

echo "🔧 TaskMaster Logrefine Path Fix"
echo "================================="
echo ""

# Check if Docker containers are running
echo "🔍 Checking Docker containers..."
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Error: Docker containers are not running!"
    echo "   Please start containers first: docker compose up -d"
    exit 1
fi

echo "✅ Docker containers are running"
echo ""

# Check if MySQL container exists
MYSQL_CONTAINER=$(docker compose ps --services | grep mysql)
if [ -z "$MYSQL_CONTAINER" ]; then
    echo "❌ Error: MySQL container not found in docker-compose!"
    exit 1
fi

echo "🔍 Found MySQL container: $MYSQL_CONTAINER"
echo ""

# Execute the SQL fix
echo "🔧 Applying database fix..."
echo "   Executing SQL script in MySQL container..."

# Run the SQL script in the MySQL container
docker compose exec $MYSQL_CONTAINER mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} -D ${MYSQL_DATABASE:-taskmaster} < fix_logrefine_db.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SQL script executed successfully!"
    echo ""
    echo "🔄 Next Steps:"
    echo "   1. Restart TaskMaster containers: docker compose restart taskmasterweb"
    echo "   2. Test Logrefine access: http://localhost:8199/logrefine"  
    echo "   3. Verify /logrefine/info endpoint shows task data"
    echo ""
    echo "📋 The fix should now allow Logrefine to load logrefine-tasks.json"
    echo "   from the /workspace directory instead of looking in /projects/fortigatelog"
else
    echo ""
    echo "❌ Error: SQL script execution failed!"
    echo "   Please check the Docker logs and database connection."
    exit 1
fi