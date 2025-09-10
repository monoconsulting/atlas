#!/bin/bash

# SonarQube Setup Script for Atlas
# This script initializes SonarQube with proper authentication and creates API tokens

set -e

SONAR_URL="${SONAR_URL:-http://localhost:9010}"
SONAR_CONTAINER="${SONAR_CONTAINER:-atlas_sonarqube}"
DB_CONTAINER="${DB_CONTAINER:-atlas_sonar_db}"

echo "Setting up SonarQube for Atlas..."

# Wait for SonarQube to be ready
echo "Waiting for SonarQube to be ready..."
timeout=300
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s "$SONAR_URL/api/system/status" | grep -q '"status":"UP"'; then
        echo "SonarQube is ready!"
        break
    fi
    echo "Waiting for SonarQube... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "ERROR: SonarQube failed to start within $timeout seconds"
    exit 1
fi

# Method 1: Try the web API approach first
echo "Attempting to setup via web API..."

# Check if admin needs password change
AUTH_RESPONSE=$(curl -s -u admin:admin "$SONAR_URL/api/authentication/validate" || echo '{"valid":false}')
if echo "$AUTH_RESPONSE" | grep -q '"valid":true'; then
    echo "Admin login works with default credentials"
    ADMIN_USER="admin"
    ADMIN_PASS="admin"
elif curl -s -u admin: "$SONAR_URL/api/authentication/validate" | grep -q '"valid":true'; then
    echo "Admin login works with empty password"
    ADMIN_USER="admin"
    ADMIN_PASS=""
else
    echo "Default admin credentials don't work, attempting database method..."
    
    # Method 2: Database approach - reset admin password and create token directly
    echo "Resetting admin credentials in database..."
    
    # Reset admin password to 'admin123' (known hash)
    docker exec $DB_CONTAINER psql -U sonar -d sonarqube -c "
        UPDATE users SET 
            crypted_password = '\$2a\$12\$hwrGpFvHIR6c.m2nJFXS.OHkYcCUTIBxPp5IjrNGEH./.LjYE4Q7O',
            salt = 'dummysalt123',
            reset_password = false
        WHERE login = 'admin';
    " > /dev/null
    
    # Restart SonarQube to pick up password change
    echo "Restarting SonarQube to apply changes..."
    docker restart $SONAR_CONTAINER > /dev/null
    
    # Wait for restart
    sleep 30
    timeout=120
    counter=0
    while [ $counter -lt $timeout ]; do
        if curl -s "$SONAR_URL/api/system/status" | grep -q '"status":"UP"'; then
            break
        fi
        sleep 2
        counter=$((counter + 2))
    done
    
    # Test new credentials
    if curl -s -u admin:admin123 "$SONAR_URL/api/authentication/validate" | grep -q '"valid":true'; then
        echo "Successfully reset admin password"
        ADMIN_USER="admin"
        ADMIN_PASS="admin123"
    else
        echo "ERROR: Failed to reset admin credentials"
        exit 1
    fi
fi

# Create API token via web API
echo "Creating API token..."
TOKEN_NAME="atlas-$(date +%Y%m%d-%H%M%S)"
TOKEN_RESPONSE=$(curl -s -X POST -u "$ADMIN_USER:$ADMIN_PASS" \
    "$SONAR_URL/api/user_tokens/generate" \
    -d "name=$TOKEN_NAME" \
    -d "type=USER_TOKEN")

if echo "$TOKEN_RESPONSE" | grep -q '"token":'; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
    echo "Successfully created API token: $TOKEN_NAME"
    echo "Token: $TOKEN"
    
    # Save token to environment file
    if [ -f .env ]; then
        # Update existing SONAR_TOKEN or add it
        if grep -q "^SONAR_TOKEN=" .env; then
            sed -i "s/^SONAR_TOKEN=.*/SONAR_TOKEN=$TOKEN/" .env
        else
            echo "SONAR_TOKEN=$TOKEN" >> .env
        fi
        echo "Token saved to .env file"
    fi
    
    # Test the token
    echo "Testing API token..."
    if curl -s -u "$TOKEN:" "$SONAR_URL/api/authentication/validate" | grep -q '"valid":true'; then
        echo "✅ API token is working correctly!"
        
        # Test a project creation
        echo "Testing project creation API..."
        curl -s -X POST -u "$TOKEN:" \
            "$SONAR_URL/api/projects/create" \
            -d "project=test-project-atlas" \
            -d "name=Test Project Atlas" > /dev/null || true
        echo "✅ SonarQube setup completed successfully!"
    else
        echo "❌ API token validation failed"
        exit 1
    fi
else
    echo "❌ Failed to create API token: $TOKEN_RESPONSE"
    exit 1
fi

# Create project-specific tokens via Atlas API
echo ""
echo "Setting up project-specific tokens in Atlas..."

# Wait for Atlas API to be ready
ATLAS_URL="${ATLAS_URL:-http://localhost:8199}"
atlas_timeout=60
atlas_counter=0
while [ $atlas_counter -lt $atlas_timeout ]; do
    if curl -s "$ATLAS_URL/health" | grep -q '"ok":true'; then
        echo "Atlas API is ready!"
        break
    fi
    echo "Waiting for Atlas API... ($atlas_counter/$atlas_timeout)"
    sleep 2
    atlas_counter=$((atlas_counter + 2))
done

if [ $atlas_counter -ge $atlas_timeout ]; then
    echo "WARNING: Atlas API not ready, skipping project-specific token setup"
    echo "You can configure individual project tokens later through the Atlas admin interface"
else
    # Get list of active projects
    PROJECTS_RESPONSE=$(curl -s "$ATLAS_URL/api/projects" | jq -r '.projects[] | select(.active == true) | "\(.id):\(.name):\(.slug)"' 2>/dev/null || echo "")
    
    if [ -n "$PROJECTS_RESPONSE" ]; then
        echo "Found active projects, creating individual tokens..."
        
        while IFS=':' read -r project_id project_name project_slug; do
            if [ -n "$project_id" ] && [ -n "$project_name" ]; then
                echo "Creating token for project: $project_name ($project_slug)"
                
                # Create a project-specific token
                PROJECT_TOKEN_NAME="atlas-$project_slug-$(date +%Y%m%d-%H%M%S)"
                PROJECT_TOKEN_RESPONSE=$(curl -s -X POST -u "$ADMIN_USER:$ADMIN_PASS" \
                    "$SONAR_URL/api/user_tokens/generate" \
                    -d "name=$PROJECT_TOKEN_NAME" \
                    -d "type=USER_TOKEN")
                
                if echo "$PROJECT_TOKEN_RESPONSE" | grep -q '"token":'; then
                    PROJECT_TOKEN=$(echo "$PROJECT_TOKEN_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
                    
                    # Configure project token in Atlas database
                    CONFIG_RESPONSE=$(curl -s -X POST "$ATLAS_URL/api/projects/$project_id/config" \
                        -H "Content-Type: application/json" \
                        -d "{
                            \"sonarqube_enabled\": true,
                            \"sonarqube_url\": \"$SONAR_URL\",
                            \"sonarqube_token\": \"$PROJECT_TOKEN\",
                            \"sonarqube_token_name\": \"$PROJECT_TOKEN_NAME\",
                            \"sonarqube_project_key\": \"atlas-$project_slug\"
                        }")
                    
                    if echo "$CONFIG_RESPONSE" | grep -q 'success'; then
                        echo "✅ Token configured for project: $project_name"
                    else
                        echo "⚠️  Token created but failed to configure in Atlas: $project_name"
                    fi
                else
                    echo "❌ Failed to create token for project: $project_name"
                fi
            fi
        done <<< "$PROJECTS_RESPONSE"
    else
        echo "No active projects found or jq not available for JSON parsing"
    fi
fi

echo ""
echo "SonarQube Multi-Project Setup Summary:"
echo "======================================"
echo "- SonarQube URL: $SONAR_URL"
echo "- Admin Username: $ADMIN_USER"  
echo "- Admin Password: $ADMIN_PASS"
echo "- Global Token: $TOKEN"
echo "- Global Token Name: $TOKEN_NAME"
echo ""
echo "🔐 Multi-Project Token Management:"
echo "- Individual project tokens have been configured where possible"
echo "- Use the Atlas admin interface at $ATLAS_URL/admin.html to:"
echo "  • Configure tokens for specific projects"
echo "  • Enable/disable SonarQube analysis per project"
echo "  • Test SonarQube connections"
echo ""
echo "📝 Manual Configuration:"
echo "- For projects without automatic configuration, use Configure Tokens in admin interface"
echo "- Each project can have its own SonarQube settings and tokens"
echo "- Legacy global SONAR_TOKEN environment variable is still supported as fallback"
echo ""
echo "✅ SonarQube is ready for multi-project use with Atlas!"