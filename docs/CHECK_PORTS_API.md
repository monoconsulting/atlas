# Port Management API Documentation

## Overview
The Port Management API provides a comprehensive system for tracking and managing port allocations across multiple TaskMaster projects. This API is part of the Atlas Web interface and enables centralized port registry management with full CRUD operations.

## Database Schema

### Port Table Structure
```sql
ports
├── id (INT, Primary Key, Auto-increment)
├── project_id (INT, Foreign Key → projects.id)
├── port (INT) - External/host port (e.g., 33306)
├── internal_port (INT, Optional) - Container port (e.g., 3306)
├── service_name (VARCHAR, Optional) - Service identifier (e.g., "mysql", "web", "api")
├── description (TEXT, Optional) - Detailed description of the port usage
├── protocol (VARCHAR, Default: "tcp") - Network protocol (tcp/udp)
├── active (BOOLEAN, Default: true) - Soft delete flag
├── created_at (DATETIME) - Creation timestamp
└── updated_at (DATETIME) - Last modification timestamp
```

## API Endpoints

### 1. Get All Ports
**Endpoint:** `GET /api/ports`  
**Description:** Retrieves all active ports with their associated project information.

**Response Structure:**
```json
{
  "ok": true,
  "ports": [
    {
      "id": 1,
      "project_id": 5,
      "port": 33306,
      "internal_port": 3306,
      "service_name": "mysql",
      "description": "MySQL database for project",
      "protocol": "tcp",
      "active": true,
      "created_at": "2025-08-28T10:00:00",
      "updated_at": "2025-08-28T10:00:00",
      "project_name": "Atlas",
      "project_slug": "atlas"
    }
  ]
}
```

### 2. Get Project Ports
**Endpoint:** `GET /api/projects/{project_id}/ports`  
**Description:** Retrieves all ports associated with a specific project.

**Path Parameters:**
- `project_id` (integer): The ID of the project

**Response Structure:**
```json
{
  "ok": true,
  "ports": [...],
  "project": {
    "id": 5,
    "name": "Atlas",
    "slug": "atlas",
    ...
  }
}
```

### 3. Create New Port
**Endpoint:** `POST /api/ports`  
**Description:** Creates a new port entry in the registry.

**Request Body:**
```json
{
  "project_id": 5,
  "port": 33306,
  "internal_port": 3306,
  "service_name": "mysql",
  "description": "MySQL database container",
  "protocol": "tcp",
  "active": true
}
```

**Validation:**
- Verifies project exists and is active
- Checks for port conflicts within the same project
- Validates protocol value (tcp/udp)

**Response:** Returns the created port object with generated ID and timestamps.

### 4. Get Port Details
**Endpoint:** `GET /api/ports/{port_id}`  
**Description:** Retrieves detailed information about a specific port.

**Path Parameters:**
- `port_id` (integer): The ID of the port

**Response:** Single port object with all fields.

### 5. Update Existing Port
**Endpoint:** `PATCH /api/ports/{port_id}`  
**Description:** Updates an existing port configuration.

**Path Parameters:**
- `port_id` (integer): The ID of the port to update

**Request Body:** (All fields optional)
```json
{
  "project_id": 6,
  "port": 33307,
  "internal_port": 3306,
  "service_name": "mysql-secondary",
  "description": "Updated description",
  "protocol": "tcp",
  "active": true
}
```

**Validation:**
- Checks for port conflicts if port number is being changed
- Validates project exists if project_id is being changed
- Ensures port exists before updating

### 6. Delete Port
**Endpoint:** `DELETE /api/ports/{port_id}`  
**Description:** Soft deletes a port (marks as inactive).

**Path Parameters:**
- `port_id` (integer): The ID of the port to delete

**Response:**
```json
{
  "ok": true,
  "message": "Port deleted successfully"
}
```

## External API Endpoints

### 7. External Get All Ports
**Endpoint:** `GET /api/external/ports`  
**Description:** External API endpoint for retrieving all ports with complete project details. Designed for integration with external systems.

**Response:** Enhanced port data with full project information for external consumption.

### 8. External Create Port
**Endpoint:** `POST /api/external/ports`  
**Description:** External API endpoint for creating ports from external systems.

**Features:**
- Same validation as internal create endpoint
- Enhanced error reporting for external systems
- Returns standardized response format

## Docker Integration

### 9. Docker Port Import
**Endpoint:** `POST /api/docker/import`  
**Description:** Scans Docker containers and automatically imports discovered ports to the database.

**Request Body (Optional):**
```json
{
  "project_id": 5
}
```

**Functionality:**
- Executes Docker commands to discover running containers
- Parses port mappings from container configurations
- Automatically creates port entries in the database
- Associates ports with specified project or detects from container labels

## Data Models (Pydantic)

### PortCreate
Used for creating new ports:
- `project_id` (required): Associated project
- `port` (required): External port number
- `internal_port` (optional): Container/internal port
- `service_name` (optional): Service identifier
- `description` (optional): Port description
- `protocol` (default: "tcp"): Network protocol
- `active` (default: true): Active status

### PortUpdate
Used for updating existing ports (all fields optional):
- Same fields as PortCreate but all optional
- Allows partial updates

### PortResponse
API response format including:
- All port fields from database
- Additional computed fields:
  - `project_name`: Name of associated project
  - `project_slug`: URL slug of associated project
- Formatted timestamps

## Key Features

### 1. Port Conflict Prevention
The API validates that no two services within the same project use the same external port, preventing Docker conflicts.

### 2. Soft Delete Architecture
Ports are never physically deleted from the database. Instead, they're marked as `active=false`, preserving historical data.

### 3. Project Integration
Every port is associated with a project, enabling:
- Project-specific port listings
- Bulk operations per project
- Cross-project port conflict detection

### 4. Docker Format Support
The API understands Docker port mapping format (external:internal), making it easy to:
- Import existing Docker configurations
- Generate Docker Compose port mappings
- Validate port availability

### 5. Protocol Support
Supports both TCP and UDP protocols, essential for:
- Gaming servers (often use UDP)
- Database connections (typically TCP)
- Mixed-protocol applications

## Frontend Integration

The admin interface at `/web/admin.html` provides:
- Visual port management table
- Advanced filtering (by port, service, project, protocol)
- Port creation form with Docker format explanation
- Real-time search across all port fields
- Integration with project management interface

## Usage Examples

### Example: List all MySQL ports
```javascript
fetch('/api/ports')
  .then(res => res.json())
  .then(data => {
    const mysqlPorts = data.ports.filter(p => 
      p.service_name && p.service_name.toLowerCase().includes('mysql')
    );
    console.log('MySQL ports:', mysqlPorts);
  });
```

### Example: Create a new port mapping
```javascript
fetch('/api/ports', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    project_id: 5,
    port: 8080,
    internal_port: 80,
    service_name: 'nginx',
    description: 'Web server for frontend'
  })
})
.then(res => res.json())
.then(data => console.log('Created port:', data.port));
```

### Example: Check port availability
```javascript
async function isPortAvailable(portNumber, projectId) {
  const response = await fetch(`/api/projects/${projectId}/ports`);
  const data = await response.json();
  return !data.ports.some(p => p.port === portNumber);
}
```

## Error Handling

All endpoints return consistent error responses:
```json
{
  "detail": "Error message",
  "status_code": 404/409/500
}
```

Common error scenarios:
- **404**: Port or project not found
- **409**: Port conflict detected
- **500**: Database or server errors

## Best Practices

1. **Always specify internal_port** for Docker containers to maintain clear mapping documentation
2. **Use descriptive service_name** values for easier filtering and identification
3. **Include descriptions** for complex port configurations or non-standard usage
4. **Check for conflicts** before creating new ports using the project-specific endpoint
5. **Use soft delete** to preserve port allocation history

## Security Considerations

- All port data is stored in a local MySQL database
- No authentication is currently required (designed for local development)
- Port information doesn't include sensitive credentials
- External API endpoints are designed for trusted internal networks

## Future Enhancements

Potential improvements to the Port API:
- Port range support (e.g., 3000-3010)
- Automatic conflict resolution suggestions
- Port usage statistics and analytics
- Integration with Docker Compose file generation
- Port reservation system for future projects
- Webhook notifications for port changes