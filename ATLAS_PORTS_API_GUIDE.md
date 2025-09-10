# Atlas Ports API Guide for AI Agents

## Purpose
This guide explains how AI agents can interact with the Atlas Ports Management System to track, register, and query port allocations across multiple projects in a development environment.

## Core Concepts

### What is a Port Entry?
A port entry represents a network service binding with the following components:
- **External Port**: The port exposed on the host machine (e.g., 8199)
- **Internal Port**: The port inside the Docker container (e.g., 8000)
- **Service**: The application or service name (e.g., "mysql", "web", "api")
- **Project**: The project this port belongs to (identified by project_id)

### Why Track Ports?
- **Conflict Prevention**: Ensure no two services use the same external port
- **Service Discovery**: Find which port a specific service is running on
- **Project Organization**: Track all ports associated with a specific project
- **Infrastructure Documentation**: Maintain a live registry of port allocations

## API Endpoints

### 1. GET /api/external/ports
**Purpose**: Retrieve all registered ports with complete project details

**Request**:
```bash
curl -s http://localhost:8199/api/external/ports
```

**Response Structure**:
```json
{
  "ok": true,
  "ports": [
    {
      "id": 1,                           // Unique port record ID
      "project_id": 1,                   // Which project owns this port
      "port": 8199,                      // External port (host machine)
      "internal_port": 8000,             // Internal port (container)
      "service_name": "atlas",   // Service identifier
      "description": "TaskMaster Web Interface",
      "protocol": "tcp",                 // Network protocol (tcp/udp)
      "created_at": "2025-08-28T13:14:03Z",
      "updated_at": "2025-08-28T13:14:03Z",
      "active": true,                    // Is this port active?
      "project_name": "Atlas",   // Human-readable project name
      "project_slug": "atlas",   // URL-safe project identifier
      "project_details": {               // Complete project information
        "id": 1,
        "slug": "atlas",
        "name": "Atlas",
        "path": "/projects/atlas",
        "task_file_path": "/projects/atlas/.taskmaster/tasks/tasks.json",
        "description": "Main TaskMaster Web project",
        "prod_url": null,
        "dev_url": null,
        "docs_url": null,
        "phpmyadmin_url": null,
        "created_at": "2025-08-28T10:30:26Z",
        "updated_at": "2025-08-28T13:10:09Z",
        "active": true
      }
    }
  ],
  "total_count": 7,         // Total number of ports registered
  "active_projects": 2      // Number of unique projects with ports
}
```

**Use Cases for AI Agents**:
- Check if a specific port is available before allocating
- Find all ports for a specific project
- Discover service endpoints dynamically
- Map Docker compose configurations

### 2. POST /api/external/ports
**Purpose**: Register a new port allocation

**Request**:
```bash
curl -X POST http://localhost:8199/api/external/ports \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "port": 5432,
    "internal_port": 5432,
    "service_name": "postgres",
    "description": "PostgreSQL Database",
    "protocol": "tcp"
  }'
```

**Request Fields**:
- `project_id` (required, integer): The project ID this port belongs to
- `port` (required, integer): External port number (1-65535)
- `internal_port` (optional, integer): Container port (defaults to null)
- `service_name` (optional, string): Service identifier (e.g., "mysql", "redis")
- `description` (optional, string): Human-readable description
- `protocol` (optional, string): "tcp" or "udp" (defaults to "tcp")

**Success Response** (201):
```json
{
  "ok": true,
  "port": {
    "id": 8,
    "project_id": 1,
    "port": 5432,
    "internal_port": 5432,
    "service_name": "postgres",
    "description": "PostgreSQL Database",
    "protocol": "tcp",
    "created_at": "2025-08-28T14:15:00Z",
    "updated_at": "2025-08-28T14:15:00Z",
    "active": true,
    "project_name": "Atlas",
    "project_slug": "atlas",
    "project_details": { /* full project details */ }
  },
  "message": "Port 5432 created successfully for project 'Atlas'"
}
```

**Error Responses**:
- **404 Not Found**: Project doesn't exist
  ```json
  {"detail": "Project with ID 999 not found"}
  ```
- **409 Conflict**: Port already exists for this project
  ```json
  {"detail": "Port 8086 already exists for project 1"}
  ```

## AI Agent Implementation Patterns

### Pattern 1: Check Port Availability
```python
# Before allocating a new service port
def is_port_available(port_number):
    response = requests.get("http://localhost:8199/api/external/ports")
    existing_ports = response.json()["ports"]
    used_ports = [p["port"] for p in existing_ports]
    return port_number not in used_ports
```

### Pattern 2: Register Docker Service Ports
```python
# When spinning up a new Docker container
def register_docker_service(project_id, service_name, external_port, internal_port):
    payload = {
        "project_id": project_id,
        "port": external_port,
        "internal_port": internal_port,
        "service_name": service_name,
        "description": f"Docker service {service_name}",
        "protocol": "tcp"
    }
    response = requests.post(
        "http://localhost:8199/api/external/ports",
        json=payload
    )
    return response.json()
```

### Pattern 3: Find Service Endpoint
```python
# Discover where a service is running
def find_service_port(project_slug, service_name):
    response = requests.get("http://localhost:8199/api/external/ports")
    ports = response.json()["ports"]
    
    for port in ports:
        if (port["project_slug"] == project_slug and 
            port["service_name"] == service_name):
            return port["port"]
    return None
```

### Pattern 4: Project Port Inventory
```python
# Get all ports for a specific project
def get_project_ports(project_id):
    response = requests.get("http://localhost:8199/api/external/ports")
    all_ports = response.json()["ports"]
    project_ports = [p for p in all_ports if p["project_id"] == project_id]
    return project_ports
```

## Important Considerations for AI Agents

### 1. Port Conflicts
- Always check if a port is available before allocation
- Ports are unique per project (same port can't be used twice in one project)
- Different projects CAN share the same external port (though not recommended)

### 2. Docker Port Mapping Format
- External port: What users access (e.g., localhost:8199)
- Internal port: What the container exposes (e.g., 8000)
- Docker format: `external:internal` (e.g., "8199:8000")

### 3. Service Name Conventions
Common service names to use for consistency:
- `web`, `frontend` - Web interfaces
- `api`, `backend` - API servers
- `mysql`, `postgres`, `mongodb` - Databases
- `redis`, `memcached` - Cache services
- `phpmyadmin`, `pgadmin` - Database management tools
- `nginx`, `traefik` - Reverse proxies

### 4. Project Discovery
Before registering ports, verify the project exists:
```bash
curl http://localhost:8199/api/projects
```

### 5. Port Ranges
Recommended port allocation strategy:
- 3000-3999: Frontend applications
- 8000-8999: Backend APIs
- 9000-9999: Development tools
- 5000-5999: Microservices
- 3306, 5432, 27017: Standard database ports
- 6379: Redis
- 11211: Memcached

## Example Workflow for AI Agents

### Scenario: Setting up a new full-stack application

1. **Check available projects**:
```bash
curl http://localhost:8199/api/projects
# Find project_id for your project
```

2. **Check current port allocations**:
```bash
curl http://localhost:8199/api/external/ports
# Identify used ports to avoid conflicts
```

3. **Register frontend port**:
```bash
curl -X POST http://localhost:8199/api/external/ports \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 2,
    "port": 3001,
    "internal_port": 3000,
    "service_name": "frontend",
    "description": "React development server"
  }'
```

4. **Register backend port**:
```bash
curl -X POST http://localhost:8199/api/external/ports \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 2,
    "port": 8001,
    "internal_port": 8000,
    "service_name": "api",
    "description": "FastAPI backend"
  }'
```

5. **Register database port**:
```bash
curl -X POST http://localhost:8199/api/external/ports \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 2,
    "port": 5433,
    "internal_port": 5432,
    "service_name": "postgres",
    "description": "PostgreSQL database"
  }'
```

## Debugging Tips

### Check API Health
```bash
curl http://localhost:8199/health
# Expected: {"ok":true,"message":"atlas is alive"}
```

### View All Registered Ports
```bash
curl -s http://localhost:8199/api/external/ports | python -m json.tool
```

### Test Port Registration
```bash
# Try to register a test port
curl -X POST http://localhost:8199/api/external/ports \
  -H "Content-Type: application/json" \
  -d '{"project_id": 1, "port": 9999, "service_name": "test"}'
```

## Error Handling

Common errors and solutions:

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 404 | Project not found | Verify project_id exists using /api/projects |
| 409 | Port conflict | Choose a different port number |
| 422 | Invalid data | Check required fields and data types |
| 500 | Server error | Check Docker logs: `docker logs atlas` |

## Summary

The Atlas Ports API provides a centralized registry for port management across development projects. AI agents should:

1. **Always check** existing ports before allocation
2. **Register ports** immediately after container creation
3. **Use consistent** service naming conventions
4. **Include descriptions** for better documentation
5. **Handle errors** gracefully with retry logic

This system ensures organized port management, prevents conflicts, and enables dynamic service discovery in complex development environments.