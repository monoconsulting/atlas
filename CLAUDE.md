# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskMasterWeb is a self-contained, portable FastAPI-based task management web UI designed to work with the `task-master-ai` framework. It provides a visual layer for managing tasks and subtasks across multiple projects without complex setup. The system directly manipulates `.taskmaster/tasks.json` files to ensure seamless compatibility with the Task Master AI CLI tool.

### Core Principles
- **Self-Contained & Portable**: Runs entirely in Docker with no external dependencies or CDN requirements
- **Project Agnostic**: Can be dropped into any project and mount any project's root directory
- **Direct File Manipulation**: Reads/writes native `.taskmaster/tasks.json` files for CLI compatibility
- **Intuitive UI**: Clean, responsive interface with modal dialogs and visual priority indicators

## Development Commands

### Running the Application

```bash
# Start with Docker Compose (recommended)
docker compose up -d --build

# Access the application
# Default: http://localhost:8099
```

### Building Tailwind CSS

The application uses Tailwind CSS compiled at build time (no CDN dependency). During Docker build, Tailwind CSS is automatically compiled from `app/static/tw.css` to `app/static/tailwind.css`.

### Environment Setup

1. Copy `.env.example` to `.env`
2. Set `PROJECT_ROOT` to the absolute path of your project containing `.taskmaster` directory
3. Optionally configure `HOST_PORT` (default: 8099)
4. Optional: Set `PROJECT_NAME` to customize the project name displayed in the UI

## Architecture

### Backend Structure (FastAPI)

- **app/main.py**: FastAPI application with REST endpoints for task CRUD operations
- **app/models.py**: Pydantic models and dataclasses for tasks, subtasks, and request/response schemas
- **app/storage.py**: TaskStorage class handling JSON file I/O for task persistence
- **app/static/**: Frontend assets (index.html, tw.css, compiled tailwind.css)

### API Endpoints

- `GET /health`: Health check endpoint
- `GET /info`: Storage configuration and project information
- `GET /tasks`: List tasks for a tag (defaults to currentTag)
- `GET /task/{task_id}`: Get specific task by ID
- `POST /task`: Create new task
- `PATCH /task/{task_id}`: Update existing task
- `POST /task/{task_id}/subtask`: Add subtask to task
- `PATCH /task/{task_id}/subtask/{sub_id}`: Update subtask

### Data Storage & File Discovery

**File Discovery Logic:**
- Primary path: `{PROJECT_ROOT}/.taskmaster/`
- Fallback path: `{PROJECT_ROOT}/taskmaster/`
- Auto-creates `.taskmaster/` on first task creation if neither exists

**Data Structure:**
Tasks stored in JSON at `{PROJECT_ROOT}/.taskmaster/tasks/tasks.json`:
- Tasks organized by tags (e.g., "master")
- Task fields: id, title, description, status ("todo"/"in-progress"/"done"), priority ("low"/"medium"/"high"), due_date (YYYY-MM-DD), assigned_to, estimate, labels, dependencies, subtasks
- SubTask fields: Same as Task but without subtasks array
- State file at `.taskmaster/state.json` tracks currentTag

**Compatibility:** Fully compatible with `claude-task-master` (MCP fork) which maintains the same `.taskmaster` directory structure.

### MCP Server Component

Located in `mcp-server-taskmaster/`, this TypeScript component provides a minimal Model Context Protocol server for TaskMasterWeb integration.

### AI Helper Package

The `task_master_ai/` directory contains a Python package for AI-assisted utilities with OpenAI integration fallback.

## UI Architecture & Features

### Layout Structure
- **Responsive Design**: Two-column layout adapting to different screen sizes
- **Header**: "Task Master AI — {Project Name}" with working directory subtitle
- **Modals**: Vertically scrollable, backdrop-closable, prevent background scrolling

### Left Column (Input)
1. **Storage Info Panel**: Displays `/info` endpoint JSON with refresh button
2. **Add Task Panel**: Form with chip-based dependency selector (dropdown + removable tags)
3. **Add Subtask Panel**: Parent ID input with existing subtasks list showing priority badges and status toggles

### Right Column (Display)
1. **Filters Panel**: Status, Priority, and Tag filtering controls
2. **Task List Panel**: Cards sorted by status then ID, with visual priority indicators (red=high, orange=medium, neutral=low)

### Edit Task Modal
- Activated by clicking task cards
- Pre-populated form with chip-based dependency management
- Inline subtask editing and creation within modal
- Priority badge in modal header

## Key Implementation Details

- **Validation**: Pydantic models enforce field constraints (regex patterns for status/priority, date formats)
- **File Safety**: TaskStorage uses atomic writes with temp files to prevent corruption
- **Error Recovery**: JSON parsing includes fallback for partial/corrupted files
- **ID Generation**: Auto-incrementing IDs for tasks and subtasks within their scopes
- **Timestamps**: Automatic created_at/updated_at ISO timestamps with UTC timezone
- **Security**: File paths constrained to mounted `/workspace` directory to prevent traversal
- **Performance**: Client-side filtering/sorting for responsive UI

## Docker Configuration

- Python 3.11 slim base image
- Tailwind CSS binary downloaded and compiled during build
- Volumes mount `PROJECT_ROOT` to `/workspace` in container
- Environment variables configure storage paths and project name

## Testing & Development

### Installing Development Dependencies

```bash
# Install development tools
pip install -r requirements-dev.txt
```

### Code Quality Commands

```bash
# Format code with Black
black app/ task_master_ai/

# Lint code with Flake8
flake8 app/ task_master_ai/

# Type checking with mypy
mypy app/ task_master_ai/

# Run all checks
black app/ task_master_ai/ && flake8 app/ task_master_ai/ && mypy app/ task_master_ai/
```

### Pre-commit Workflow

Before committing code, run:
```bash
# Format and check code
black app/ task_master_ai/
flake8 app/ task_master_ai/
mypy app/ task_master_ai/
```

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
