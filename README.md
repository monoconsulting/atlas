
# Atlas - Multi-Project Task Management Platform

A self-contained, portable FastAPI-based task management web UI designed to work with the `task-master-ai` framework. Supports multiple projects with custom URL routing and project-specific task storage.

## Features

- **Multi-Project Support**: Manage multiple TaskMaster projects from a single interface
- **Custom URL Routing**: Access projects via custom URLs (e.g., `localhost:8199/project-slug`)
- **Project Administration**: Full CRUD interface for managing projects
- **Database Integration**: MySQL backend for project metadata storage
- **TaskMaster AI Compatibility**: Direct `.taskmaster/tasks.json` file manipulation
- **Development Hub**: Integrated admin panel and test reporting dashboard
- **Docker Deployment**: Self-contained containerized deployment with no external dependencies

## Quick Start

1) **Setup Environment**: Copy `.env.example` → `.env` and configure:
   ```env
   PROJECT_ROOT=/path/to/your/taskmaster/project
   HOST_PORT=8199
   WEB_HOST_PORT=9652
   ```

2) **Start Services**: 
   ```bash
   docker compose up -d --build
   ```

3) **Access Applications**:
   - **Development Hub**: `http://localhost:9652/` (auto-started)
   - **Admin Panel**: `http://localhost:9652/admin.html`
   - **Main TaskMaster**: `http://localhost:8199/`
   - **Project-Specific**: `http://localhost:8199/{project-slug}`

## Multi-Project Architecture

### Project URL Routing
- **Root URL**: `http://localhost:8199/` - Default TaskMaster interface
- **Project URLs**: `http://localhost:8199/{slug}` - Project-specific interfaces
- **API Endpoints**: Automatically routed to project-specific storage

### Project Management
Use the admin panel at `http://localhost:9652/admin.html` to:
- Add new projects with custom URL slugs
- Configure project paths and descriptions
- Enable/disable projects
- Edit project metadata

### Storage Architecture
Each project maintains isolated TaskMaster data:
```
/projects/{project-name}/.taskmaster/
├── tasks/
│   └── tasks.json          # Project-specific tasks
├── state.json              # Current tag state
└── config.json             # Project configuration
```

## Changelog

### 2025-08-25 - Multi-Project Support Implementation
- **Added**: Complete multi-project architecture with database backend
- **Added**: MySQL integration for project metadata storage  
- **Added**: Custom URL routing (`localhost:8199/{project-slug}`)
- **Added**: Project administration interface at `/admin.html`
- **Added**: Project-specific API endpoints and storage isolation
- **Added**: Automatic web development hub startup on port 9652
- **Added**: E:\projects directory mount for Windows compatibility
- **Fixed**: TaskStorage class to properly handle project-specific paths and tags
- **Fixed**: JSON parsing with improved error recovery for corrupted files
- **Added**: CORS middleware for cross-origin API access
- **Enhanced**: Docker compose configuration with dedicated webserver service

### 2025-08-25 - Subtask Functionality Fixes
- **Fixed**: Subtasks now save properly with main "Save Changes" button in edit modal
- **Removed**: Confusing green "Save Subtask" buttons that were misleading users
- **Improved**: Modal UX with backdrop click to close and proper scroll behavior
- **Added**: Comprehensive test coverage for subtask persistence and modal interactions
- **Fixed**: Windows MCP configuration compatibility with `cmd /c` wrapper
- **Verified**: End-to-end data persistence in tasks.json with full test automation
