# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important rules
- You must always update CLAUDE.md, and create an ADR if necessary.
- You must always do a full test of all functions you supplied and get a 100% result. The test result must be stored in /web/test-reports, and /web/test-results.html must always be updated using the existing structure.
- You must always work on a task in task-master. No other todo list are ok.
- You must always work on a branch of dev named TMXXX-taskname
- 🚨 **CRITICAL**: The Subtask Management system is PROTECTED and LOCKED. DO NOT MODIFY any subtask-related code without explicit authorization. See Subtask Management section for details.
## Project Overview

Atlas is a self-contained, portable FastAPI-based task management web UI designed to work with the `task-master-ai` framework. It provides a visual layer for managing tasks and subtasks across multiple projects with complete project isolation and custom URL routing. The system directly manipulates `.taskmaster/tasks.json` files to ensure seamless compatibility with the Task Master AI CLI tool.

### Core Principles
- **Self-Contained & Portable**: Runs entirely in Docker with no external dependencies or CDN requirements
- **Multi-Project Architecture**: Manage multiple TaskMaster projects from a single interface with isolated storage
- **Custom URL Routing**: Access projects via custom URLs (e.g., `localhost:8199/project-slug`)
- **Direct File Manipulation**: Reads/writes native `.taskmaster/tasks.json` files for CLI compatibility
- **Intuitive UI**: Clean, responsive interface with modal dialogs and visual priority indicators
- **Administrative Interface**: Full CRUD operations for project management through web interface

## Development Commands

### Running the Application

```bash
# Start with Docker Compose (recommended)
docker compose up -d --build

# Access the applications
# Development Hub: http://localhost:9652 (auto-started)
# Admin Panel: http://localhost:9652/admin.html
# Main TaskMaster: http://localhost:8199
# Project-Specific: http://localhost:8199/{project-slug}
```

### Multi-Project Management

The system now supports multiple TaskMaster projects with complete isolation:

```bash
# Project URLs follow the pattern:
http://localhost:8199/{project-slug}

# Examples:
http://localhost:8199/project-a      # Project A TaskMaster interface
http://localhost:8199/my-app         # My App project tasks
http://localhost:8199/client-work    # Client Work project tasks
```

**Project Administration**: Use `http://localhost:9652/admin.html` to:
- Add new projects with custom URL slugs
- Configure project directory paths (must be mounted in Docker)
- Edit project metadata and descriptions
- Enable/disable projects

**Project Path Configuration** (Enhanced 2025-08-25):
- **Container Paths**: Use `/projects/project-name` for projects in `E:\projects\` directory
- **Current Project**: Use `/workspace` for the current TaskMasterWeb project
- **Examples**: `/projects/my-webapp`, `/projects/client-project`, `/workspace`
- **Validation**: Paths must be absolute and accessible within Docker containers
- **Docker Mounts**: `E:\projects:/projects` and `${PROJECT_ROOT}:/workspace` in containers
- **Admin Interface**: Enhanced with clear path guidance, examples, and container format documentation

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

Located in `mcp-server-taskmaster/`, this TypeScript component provides a minimal Model Context Protocol server for Atlas integration.

**Windows Configuration**: The `.mcp.json` file includes Windows-specific configuration using `cmd /c` wrapper for `npx` execution compatibility.

### AI Helper Package

The `task_master_ai/` directory contains a Python package for AI-assisted utilities with OpenAI integration fallback.

## UI Architecture & Features

### Layout Structure
- **Responsive Design**: Two-column layout adapting to different screen sizes
- **Header**: "Atlas Task-Master — {Project Name}" with working directory subtitle (Updated 2025-08-25)
- **Modals**: Vertically scrollable, backdrop-closable, prevent background scrolling

### Left Column (Input)
1. **Storage Info Panel**: Displays `/info` endpoint JSON with refresh button
2. **Add Task Panel**: Form with chip-based dependency selector (dropdown + removable tags)
3. **Add Subtask Panel**: Parent ID input with existing subtasks list showing priority badges and status toggles

### Right Column (Display)
1. **Advanced Filters Panel**: Comprehensive filtering system with four main columns:
   - **Status Filters**: Todo, In Progress, Done checkboxes
   - **Priority Filters**: High, Medium, Low priority selection
   - **Tags Filters**: Dynamic tag-based filtering with current project tags (Added 2025-08-25)
   - **Advanced Search**: Text search with sorting controls and task creation
2. **Task List Panel**: Cards sorted by status then ID, with visual priority indicators (red=high, orange=medium, neutral=low)

### Edit Task Modal
- Activated by clicking task cards
- Pre-populated form with chip-based dependency management
- Inline subtask editing and creation within modal
- Priority badge in modal header

### Task Management Features
- **Soft Delete**: Tasks can be deleted via dustbin button (bottom-right of cards)
- **Delete Confirmation**: User confirmation required before deletion
- **Data Preservation**: Deleted tasks marked as `deleted: true` in JSON but preserved for recovery
- **Visual Feedback**: Deleted tasks automatically hidden from Kanban board
- **Quick Filters**: Enhanced filtering with sorting options (ID ASC/DESC, Priority)
- **Advanced Filters**: Multi-criteria filtering with status, priority, and search capabilities

### Tags-Based Filtering System (Added 2025-08-25)
- **Dynamic Tag Loading**: Automatically discovers and loads available project tags from `/info` endpoint
- **Comprehensive Tag Support**: Includes current project tag plus common development tags (development, production, testing, feature, bugfix, hotfix, release)
- **Multi-Tag Selection**: Checkbox-based interface allowing selection of multiple tags simultaneously
- **Current Tag Indicator**: Highlights the active project tag with "(current)" label
- **Select All Functionality**: One-click toggle to select/deselect all available tags
- **Integrated Filtering**: Works seamlessly with existing status, priority, and search filters
- **Real-Time Updates**: Tag selections immediately update the task display without page reload

### 🚨 SUBTASK MANAGEMENT - CRITICAL SYSTEM (DO NOT MODIFY) 🚨
**⚠️ WARNING: This functionality is FULLY OPERATIONAL and EXTENSIVELY TESTED. Any modifications will break the system! ⚠️**

#### COMPLETE SOLUTION IMPLEMENTED - TM213 (2025-08-25)
**ROOT CAUSE**: Add Subtask button clicks were propagating to backdrop click handlers, incorrectly closing modals due to `flex items-center` CSS class detection.

**COMPREHENSIVE FIX APPLIED**:
- **Event Propagation Prevention**: `e.stopPropagation()` and `e.preventDefault()` on all Add Subtask buttons
- **Backdrop Detection Logic**: Enhanced specificity to prevent false positive modal closures
- **Interactive Element Safety**: All subtask form elements protected from event bubbling
- **Consistent Event Handling**: Both Create Modal and Edit Modal subtask functionality unified

#### VERIFIED FUNCTIONALITY ✅
- **Add Subtask in Create Modal**: Works perfectly - modal stays open, subtasks added to buffer
- **Add Subtask in Edit Modal**: Works perfectly - modal stays open, subtasks immediately saved
- **Data Persistence**: 100% verified in tasks.json backend storage
- **UI Updates**: Task cards properly display subtask counts and details
- **Form Behavior**: No modal closing, no data loss, seamless user experience

#### COMPREHENSIVE TEST COVERAGE ✅
- **Simple Subtask Test**: Modal behavior validated
- **Persistence Verification**: Full end-to-end data flow confirmed
- **Edit Task Validation**: Live subtask creation and storage verified
- **API Integration**: Backend persistence confirmed via API calls
- **UI Regression**: All existing functionality preserved

#### TECHNICAL IMPLEMENTATION
```javascript
// CRITICAL: Event handlers with propagation prevention
document.getElementById('addSubtaskBtn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();  // PREVENTS MODAL CLOSING
    addSubtaskToEditForm();
});
```

#### 🔒 SYSTEM PROTECTION NOTICE 🔒
**THIS SUBTASK SYSTEM IS NOW LOCKED AND PROTECTED**
- ❌ NO modifications to subtask event handlers
- ❌ NO changes to backdrop click detection logic
- ❌ NO alterations to subtask form HTML structure
- ❌ NO updates to subtask persistence workflow
- ✅ ONLY additions of new features outside core subtask functionality

**VIOLATION OF THESE RESTRICTIONS WILL RESULT IN SYSTEM FAILURE**

Any future development must work AROUND this system, not modify it. The days of subtask modal issues are OVER.

## Key Implementation Details

- **Validation**: Pydantic models enforce field constraints (regex patterns for status/priority, date formats)
- **File Safety**: TaskStorage uses atomic writes with temp files to prevent corruption
- **Error Recovery**: JSON parsing includes fallback for partial/corrupted files
- **ID Generation**: Auto-incrementing IDs for tasks and subtasks within their scopes
- **Timestamps**: Automatic created_at/updated_at ISO timestamps with UTC timezone
- **Security**: File paths constrained to mounted `/workspace` directory to prevent traversal
- **Performance**: Client-side filtering/sorting for responsive UI
- **Slug Validation**: Both client-side and server-side validation ensures project slugs never contain leading slashes (Fixed 2025-08-28)

## Docker Configuration

- Python 3.11 slim base image
- Tailwind CSS binary downloaded and compiled during build
- Volumes mount `PROJECT_ROOT` to `/workspace` in container
- Environment variables configure storage paths and project name

## Testing & Development

### Development Web Hub

A comprehensive development hub is available at `http://localhost:9652` when running the web server:

```bash
# Start development hub server
cd web
python server.py
```

**Hub Features:**
- **Main Application Link**: Direct access to Atlas on port 8199
- **Test Results Dashboard**: Comprehensive test reports and analytics
- **Project Documentation**: Architecture overview and feature descriptions

### Test Infrastructure

**Comprehensive Playwright Testing:**
- **Test Execution**: Automated workflow testing with video recording and screenshots
- **Test Reports**: Multi-format reports including HTML, JSON, videos, and debug traces
- **Test Coverage**: Full workflow testing from task creation to deletion
- **Issue Detection**: Identifies UI problems, broken workflows, and performance issues

**Test Report Locations:**
- **Development Hub**: `http://localhost:9652/test-results.html` (main test dashboard)
- **Playwright Reports**: `/web/test-reports/index.html` (detailed test execution)
- **Summary Reports**: `/web/test-reports/test-results.html` (comprehensive analysis)
- **Video Evidence**: Individual test execution recordings with failure analysis
- **Debug Traces**: Playwright traces for detailed debugging

### Running Tests

```bash
# Run comprehensive workflow tests
npx playwright test tests/comprehensive.spec.js --config playwright-simple.config.js

# Run subtask functionality tests (added 2025-08-25)
npx playwright test tests/31-persistence-verification.spec.js --config playwright-simple.config.js
npx playwright test tests/32-backdrop-click-test.spec.js --config playwright-simple.config.js

# Run all tests
npx playwright test --config playwright-simple.config.js

# View test results
# Navigate to: http://localhost:9652/test-results.html
```

### Installing Development Dependencies

```bash
# Install development tools
pip install -r requirements-dev.txt

# Install Playwright for testing
npm install @playwright/test
npx playwright install
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

# Run comprehensive tests
npx playwright test tests/comprehensive.spec.js --config playwright-simple.config.js
```

## Architecture Decision Records (ADRs)

### ADR-001: Project Slug Validation Implementation (2025-08-28)

**Status**: Implemented ✅  
**Context**: Project slugs were being stored with leading slashes (e.g., `/kbwhisper`), causing incorrect URL generation and routing issues.

**Problem**: 
- URLs became malformed: `localhost:8199//kbwhisper` instead of `localhost:8199/kbwhisper`
- User experience degraded with broken project navigation
- No validation existed to prevent malformed slugs

**Solution**: Implemented comprehensive slug validation at both client and server levels:

**Client-Side Validation** (`web/admin.html`):
- Enhanced `updateSlugPreview()` with real-time slug cleaning using `replace(/^\/+/, '')`
- Form submission validation strips leading slashes before API calls
- Immediate user feedback shows corrected slug format

**Server-Side Validation** (`app/database.py`):
- Added Pydantic `@validator('slug')` to `ProjectCreate` and `ProjectUpdate` models
- Automatic cleaning using `v.lstrip('/')` removes all leading slashes
- Comprehensive coverage for both POST and PATCH operations

**Testing Results**:
- ✅ POST `/api/projects` with `"/test-slug"` → Stored as `"test-slug"`
- ✅ PATCH `/api/projects/N` with `"/another-slug"` → Stored as `"another-slug"`
- ✅ Fixed existing project ID 20 from `"/kbwhisper"` to `"kbwhisper"`
- ✅ All project URLs now follow correct format: `localhost:8199/project-slug`

**Consequences**: 
- **Positive**: Data integrity maintained, URLs work correctly, user experience improved
- **Negative**: None identified
- **Risk Mitigation**: Dual validation prevents bypass, backward compatible with existing projects

### ADR-002: Test Reports Link Standardization (2025-08-28)

**Status**: Implemented ✅  
**Context**: The Development Hub's "View Reports" button was linking to an inconsistent test results file path, creating confusion in the testing workflow.

**Problem**: 
- "View Reports" button in `/web/index.html` linked to `test-results.html`
- Actual test reports were located at `/web/test-reports.html`
- Broken navigation between development hub and test reporting system
- Inconsistent file naming convention across the project

**Solution**: Updated Development Hub navigation to use standardized test reports path:

**Navigation Update** (`web/index.html` line 79):
- Changed href from `test-results.html` to `test-reports.html`
- Maintained consistent button styling and behavior
- Aligned with existing test infrastructure file naming

**Testing Results**:
- ✅ "View Reports" button now correctly navigates to `/web/test-reports.html`
- ✅ Test reports page loads successfully at `http://localhost:9652/test-reports.html`
- ✅ Development hub navigation flow is now consistent
- ✅ No breaking changes to existing test infrastructure

**Consequences**: 
- **Positive**: Consistent navigation experience, correct test report access, improved developer workflow
- **Negative**: None identified
- **Risk Mitigation**: Simple link update with immediate validation, no impact on test execution or reporting functionality

### ADR-003: URL Management and Port Tracking System (2025-08-28)

**Status**: Implemented ✅  
**Context**: Need to track system URLs (production, development, documentation, phpMyAdmin) and port mappings for better project organization and infrastructure management across multiple TaskMaster projects.

**Problem**: 
- No centralized tracking of project URLs for different environments
- No system to monitor port allocations and mappings across projects
- Manual documentation of Docker port mappings (e.g., 33306:3306)
- Difficulty in managing complex multi-service project configurations
- Need for searchable, filterable port management interface

**Solution**: Extended database schema and admin interface with comprehensive URL and port management system:

**Database Extensions**:
- **Projects Table**: Added `prod_url`, `dev_url`, `docs_url`, `phpmyadmin_url` VARCHAR(500) columns
- **New Ports Table**: Complete port tracking with project relationships:
  - `port` (external port, e.g., 33306)
  - `internal_port` (container port, e.g., 3306)  
  - `service_name` (web, mysql, api, etc.)
  - `protocol` (tcp/udp)
  - `description` and project relationships

**API Endpoints** (`app/main.py`):
- `GET /api/ports` - List all ports with project information
- `GET /api/projects/{id}/ports` - Get ports for specific project
- `POST /api/ports` - Create new port mapping
- `PATCH /api/ports/{id}` - Update existing port
- `DELETE /api/ports/{id}` - Remove port mapping
- Enhanced project endpoints to handle URL fields

**Admin Interface** (`web/admin.html`):
- **URL Management**: Four-field URL section in project forms (Production, Development, Documentation, phpMyAdmin)
- **Port Management Interface**: Dedicated section with table view
- **Advanced Filtering**: Search by port, service, project; filter by protocol; sort by multiple criteria
- **Port Form**: Intuitive external/internal port mapping with Docker format explanation
- **Navigation Integration**: "Manage Ports" button with dedicated interface

**Key Features**:
- **Port Conflict Prevention**: API validates unique ports per project
- **Comprehensive Search**: Filter ports by project name, service name, port number, description
- **Visual Port Format Guide**: Explains Docker mapping format (33306:3306)
- **Project Integration**: Port list shows project names and slugs
- **Full CRUD Operations**: Complete port lifecycle management

**Testing Results**:
- ✅ Database schema successfully extended with new fields
- ✅ API endpoints functional - tested port creation and project URL updates
- ✅ Admin interface displays URL fields and port management section
- ✅ Port filtering and sorting operations working correctly
- ✅ Data persistence confirmed in MySQL database
- ✅ No breaking changes to existing project functionality

**Consequences**: 
- **Positive**: Centralized infrastructure tracking, improved project organization, reduced manual documentation, searchable port registry
- **Negative**: Increased database complexity, additional UI maintenance
- **Risk Mitigation**: Optional fields maintain backward compatibility, comprehensive validation prevents data conflicts

### ADR-004: Docker Environment De-ambiguation for Atlas Frontend Rebuild (2025-08-28)

**Status**: Implemented ✅  
**Context**: Task 2 of Atlas Frontend Rebuild required consolidating Docker volumes to a single mount point and eliminating workspace path ambiguity.

**Problem**: 
- Multiple conflicting mount points: `/workspace`, `/projects/{slug}`, various environment-specific paths
- Empty environment variables causing `Path(".")` errors in TaskStorage
- Missing `_file_lock` method breaking atomic file operations
- Inconsistent project path formats across database records
- Path ambiguity preventing reliable API endpoints like `GET /{slug}/tasks`

**Solution**: Comprehensive Docker and storage system overhaul:

**Docker Configuration** (`docker-compose.yml`, `.env`):
- **Single Mount Point**: Consolidated to `"${PROJECTS_HOST_DIR}:/projects"` 
- **Removed Legacy Mounts**: Eliminated `/workspace` and multiple project-specific mounts
- **Clear Environment**: Set `PROJECTS_HOST_DIR=E:/projects` as single source of truth
- **Documentation**: Added comprehensive comments explaining mount strategy

**Storage System Fixes** (`app/storage.py`):
- **Added Missing File Lock**: Implemented `_file_lock` contextmanager with portalocker
- **Fixed Path Resolution**: Enhanced environment variable handling to prevent empty path errors
- **Default Path Update**: Changed from `/workspace` to `/projects/taskmasterweb/.taskmaster`
- **Container Path Validation**: Only use environment variables when non-empty

**Database Migration** (`app/database.py`, `scripts/migrate_to_container_paths.py`):
- **Path Validators**: Added Pydantic validators enforcing `/projects/` prefix
- **Automatic Migration**: Created script to convert existing paths to container format  
- **Data Integrity**: All project records now use consistent `/projects/{slug}` format

**Comprehensive Testing** (11/11 tests passed):
- Docker syntax validation and mount verification
- Container rebuild without errors (no-cache build)
- Cross-container file access validation
- API functionality testing with new paths
- Database path consistency verification

**Testing Results**:
- ✅ All containers use single `/projects` mount point
- ✅ TaskStorage operations work with proper file locking
- ✅ API endpoints functional: `GET /info`, `POST /task`, `GET /tasks`
- ✅ Database paths migrated to container format
- ✅ No path-related errors in application logs
- ✅ Cross-container file access confirmed
- ✅ Backup/restore functionality verified

**Consequences**: 
- **Positive**: Eliminated path ambiguity, robust file operations, consistent project isolation, API compliance for frontend
- **Negative**: Required container rebuilds, temporary service disruption during migration
- **Risk Mitigation**: Comprehensive testing suite, backup preservation, atomic file operations

---

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

- always rebuild with no cache and test before reporting done
- YOU MUST do a rebuild no cache BEFORE you tell me you are done.
- YOU MUST do a rebuild no cache BEFORE you tell me you are done.