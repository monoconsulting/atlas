

# **Product Requirements Document: Task Master Web UI**

## 1. Introduction & Vision

### 1.1. **Product Name**

Task Master Web UI

### 1.2. **Vision**

To provide a self-contained, portable, and intuitive web interface for visually managing `task-master-ai` tasks. This tool will act as a visual layer on top of the existing file-based task management system, enabling developers to quickly view, create, and edit tasks and subtasks across multiple projects without complex setup.

### 1.3. **Target User & Goal**

The primary user is a developer who utilizes the `task-master-ai` framework with AI agents for coding projects. The user manages multiple projects and requires a centralized, visual way to oversee and interact with the task files (`tasks.json`) for each project.

The goal is to create a "drop-in" solution: a single directory that can be placed in any project, configured with minimal effort, and launched via Docker to provide a rich web interface for task management.

## 2. Core Principles

- **Self-Contained & Portable:** The entire application (backend, frontend, and dependencies) must be packaged within a single directory and run inside Docker containers. It must have no runtime dependencies on external networks (e.g., CDNs) for its core functionality.
    
- **Project Agnostic:** The tool must not be hardcoded to a specific project. It should be able to mount any project's root directory and automatically detect the task management files.
    
- **Direct File Manipulation:** The application will read from and write to the native `.taskmaster/tasks.json` file. It will not use a separate database or proprietary data format, ensuring seamless compatibility and data integrity with the `task-master-ai` CLI tool.
    
- **Intuitive User Experience:** The UI must be clean, responsive, and provide a clear, efficient workflow for all task management operations.
    

## 3. Feature Requirements

### FR-1: System Architecture & Deployment

- **Technology Stack:**
    
    - **Backend:** FastAPI (Python) running on Uvicorn.
        
    - **Frontend:** Plain HTML, JavaScript, and Tailwind CSS.
        
    - **Containerization:** Docker & Docker Compose.
        
- **Deployment:**
    
    - The entire application will be delivered as a single directory named `taskmasterweb`.
        
    - Users will place this directory inside their project's root folder.
        
    - Configuration will be managed through a `.env` file, created from the provided `.env.example`.
        
- **Configuration (`.env` file):**
    
    - `PROJECT_ROOT`: The absolute path to the project directory on the host machine that contains the `.taskmaster` folder. This directory will be mounted into the container at `/workspace`.
        
    - `HOST_PORT`: The host port on which the web UI will be accessible (e.g., 8099).
        
    - `PROJECT_NAME` (Optional): An explicit name for the project to be displayed in the UI header. If not set, the system will automatically use the name of the `PROJECT_ROOT` directory.
        
- **Execution:** The application will be started with the command `docker compose up -d --build` from within the `taskmasterweb` directory.
    
- **CSS Handling:** Tailwind CSS will be compiled locally during the Docker image build process. The `Dockerfile` must include steps to run the Tailwind CLI and generate a static `tailwind.css` file. The `index.html` file will link to this local stylesheet, removing any dependency on external CDNs.
    

### FR-2: Backend API & Data Logic

- **File Discovery:**
    
    - The backend must locate the task directory within the mounted `/workspace`.
        
    - Primary path: `/workspace/.taskmaster/`
        
    - Fallback path: `/workspace/taskmaster/`
        
    - If neither directory exists, the system must create `/workspace/.taskmaster/` upon the first task creation.
        
- **Core Data Models:** The system will model `Task` and `SubTask` objects.
    
    - **Task Fields:** `id` (int), `title` (str), `description` (str), `status` (str: "todo", "in-progress", "done"), `priority` (str: "low", "medium", "high"), `due_date` (str, YYYY-MM-DD, optional), `assigned_to` (str, optional), `estimate` (str, optional), `labels` (list[str]), `dependencies` (list[int]), `subtasks` (list[SubTask]).
        
    - **SubTask Fields:** Same as Task, but without its own `subtasks` field.
        
- **API Endpoints (FastAPI):**
    
    - `GET /info`: Returns JSON with configuration details: `base_dir`, `tasks_file`, `state_file`, `current_tag`, and `project_name`.
        
    - `GET /tasks`: Returns a list of all tasks for the `currentTag` found in `state.json`. Accepts an optional `?tag=` query parameter to fetch tasks for a specific tag.
        
    - `GET /task/{task_id}`: Retrieves a single task by its ID.
        
    - `POST /task`: Creates a new task. The system assigns a new ID (`max(id) + 1`).
        
    - `PATCH /task/{task_id}`: Updates an existing task.
        
    - `POST /task/{task_id}/subtask`: Adds a new subtask to a parent task.
        
    - `PATCH /task/{task_id}/subtask/{sub_id}`: Updates an existing subtask.
        

### FR-3: User Interface - Layout & General

- **Layout:** A responsive, two-column layout that adapts to different screen sizes.
    
- **Header:**
    
    - Main Title: "Task Master AI — {Project Name}".
        
    - Subtitle: A descriptive text indicating the working directory (e.g., "Works with /workspace/.taskmaster…").
        
- **Modals:** All modal dialogs (e.g., for editing tasks) must:
    
    - Be vertically scrollable if their content exceeds the viewport height.
        
    - Prevent the background page from scrolling when open.
        
    - Close when the user clicks on the backdrop outside the modal content area.
        

### FR-4: User Interface - Left Column (Input)

- **Panel 1: Storage Info:**
    
    - Displays the JSON output from the `/info` endpoint in a formatted `<pre>` block.
        
    - Includes a "Refresh" button to re-fetch the info.
        
- **Panel 2: Add Task:**
    
    - A form for creating a new task with input fields for all `Task` attributes.
        
    - **Dependencies:** Implemented as a compact dropdown list of existing tasks. Users can select a task and click "Add" to add it as a "chip" (a small, removable tag). This avoids using a large, space-consuming multi-select box.
        
    - Upon successful creation, a confirmation message is shown, the form is cleared, and the Parent ID in the "Add Subtask" form below is auto-populated with the new task's ID.
        
- **Panel 3: Add Subtask:**
    
    - A form for creating new subtasks.
        
    - Includes a `Parent task ID` input field that is required.
        
    - Features a dependency selector with the same "chip"-based UI as the Add Task form.
        
    - Below the form, a list of existing subtasks for the selected Parent ID will be displayed. Each item in the list must show its number, priority (as a colored badge), title, and a checkbox to toggle its status between "todo" and "done".
        

### FR-5: User Interface - Right Column (Display)

- **Panel 1: Filters:**
    
    - Provides controls to filter the visible tasks.
        
    - Filter by: `Status`, `Priority`.
        
    - Filter by `Tag`: An input field where the user can specify a tag. If left blank, it defaults to the `currentTag`.
        
- **Panel 2: Task List:**
    
    - Displays tasks as individual cards, sorted by status ("todo" -> "in-progress" -> "done") and then by ID.
        
    - **Card Content:** Each card must clearly display the task's ID, title, status, priority, description snippet, assigned user, and dependencies.
        
    - **Card Interactivity:** The entire card is a single clickable element that opens the "Edit Task" modal.
        
    - **Visual Cues:** The card's visual style should reflect its priority. `High` priority tasks should have a distinct red accent/border, `Medium` an orange accent, and `Low` a neutral one.
        

### FR-6: User Interface - Edit Task Modal

- **Activation:** Opens when a user clicks on any task card in the right column.
    
- **Content:**
    
    - The modal header shows "Edit Task" and a colored "pill" badge indicating the task's priority.
        
    - All fields of the task are pre-populated into a form, identical in layout to the "Add Task" form, allowing for editing.
        
    - Includes the "chip"-based UI for managing dependencies.
        
    - Contains a dedicated section to list all existing subtasks. Subtasks can be edited inline within this list.
        
    - Includes a compact form to add new subtasks directly within the modal.
        

### FR-7: Compatibility with `claude-task-master` (MCP)

- The `claude-task-master` project (also known as MCP) appears to be a fork of the original `task-master-ai`.
    
- Research indicates that it maintains the same fundamental project structure, utilizing a `.taskmaster` directory within each project's root. It does not use a centralized, multi-project file structure.
    
- **Requirement:** The system must be fully compatible with this structure. The file discovery logic (checking for `.taskmaster` and falling back to `taskmaster`) already ensures this. No special handling is required, but this compatibility must be maintained.
    

## 4. Non-Functional Requirements

- **Performance:** The UI must feel responsive. Filtering and sorting of tasks should be handled client-side for instantaneous feedback.
    
- **Maintainability:** The Python backend code must be modular (e.g., `main.py` for API routes, `storage.py` for file logic, `models.py` for data structures) and well-documented. The JavaScript frontend code should be clean and organized.
    
- **Security:** As the application is intended for local use, security is not a primary public-facing concern. However, all file paths must be constrained within the mounted `/workspace` directory to prevent path traversal vulnerabilities.
    

## 5. Deliverables

- A single `.zip` archive containing the `taskmasterweb` directory.
    
- This directory must include all necessary files to run the project:
    
    - `app/` (containing all Python and HTML/JS source code)
        
    - `Dockerfile`
        
    - `docker-compose.yml`
        
    - `.env.example`
        
    - `requirements.txt`
        
    - `tailwind.config.js`
        
    - `README.md` with clear, concise setup and usage instructions.