# Multi-Project URL Routing System

## Overview
Extend TaskMasterWeb to support multiple projects through URL-based routing with custom slugs, enabling developers to access different project task instances via URLs like `localhost:9652/my-project`.

## Requirements

### Core Functionality
1. **URL-Based Project Access**: Users can access projects via custom URLs like `localhost:9652/web`, `localhost:9652/api`, etc.
2. **Custom URL Slugs**: Project administrators can set custom URL endpoints (e.g., "web", "api", "mobile", "client-work")
3. **Project Management Interface**: Simple UI to manage projects, edit slugs, and view project information
4. **Auto-Discovery**: Automatically discover projects by scanning for `.taskmaster` directories
5. **Database Storage**: Use MySQL to store project mappings (slug → project path)

### Database Schema
- **projects** table with columns: id, slug (custom URL), name (display name), path (filesystem path), description, created_at, updated_at, active
- Custom slugs must be unique and validated for URL safety
- Support for project metadata and configuration

### API Endpoints
- `GET /` - Project selector/dashboard page
- `GET /api/projects` - List all registered projects
- `POST /api/projects` - Register new project manually
- `PATCH /api/projects/{id}` - Update project (including custom slug)
- `POST /api/discover-projects` - Auto-discover projects with .taskmaster directories
- `GET /{custom_slug}` - TaskMaster UI for specific project
- `GET /{custom_slug}/api/*` - All existing TaskMaster API endpoints with project context

### User Interface
1. **Project Dashboard** (`/`):
   - Grid view of all available projects
   - Show project name, custom URL slug, description, and path
   - Edit button for each project to modify slug and details
   - "Discover Projects" and "Add Project" buttons

2. **Project Edit Modal**:
   - Edit project name, custom URL slug, and description
   - Real-time validation of slug format and uniqueness
   - Preview URL format

3. **TaskMaster UI Integration**:
   - Existing TaskMaster interface works unchanged
   - Project context automatically determined from URL
   - Breadcrumb showing current project

### Technical Requirements
- **Backward Compatibility**: Existing single-project setups continue working at root URL
- **File-Based Storage**: Continue using `.taskmaster/tasks.json` files for task data
- **SQL Database**: Only store project mapping, not task data
- **Docker Integration**: Maintain existing Docker deployment with MySQL service
- **Validation**: URL slug validation (alphanumeric, hyphens, underscores only)
- **Security**: Path validation to prevent directory traversal

### Validation Rules
- Slug format: `^[a-zA-Z0-9-_]+$`
- Maximum length: 100 characters
- Cannot start/end with hyphen
- Reserved words blocked: api, static, admin, health, info, projects, discover
- Must be unique across all projects

### Auto-Discovery Logic
- Scan configurable base paths: `/workspace`, `/workspace/projects`, `/workspace/sites`
- Find directories containing `.taskmaster` folder
- Generate initial slug from directory name
- Handle slug conflicts by appending numbers

## Success Criteria
1. Multiple projects accessible via custom URLs
2. Zero breaking changes to existing functionality
3. Simple project management interface
4. Automatic project discovery works reliably
5. All existing TaskMaster features work within project context
6. Fast project switching (< 1 second load time)

## Implementation Priority
1. Database schema and models
2. Project CRUD API endpoints
3. Auto-discovery functionality
4. URL routing and middleware
5. Project management UI
6. Integration testing and documentation