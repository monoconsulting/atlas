
# GEMINI.md

## Project Overview

This project is a self-contained, portable FastAPI-based task management web UI designed to work with the `task-master-ai` framework. It supports multiple projects with custom URL routing and project-specific task storage.

The application consists of three main services:

*   **`taskmasterweb`**: The main FastAPI application that serves the web UI and provides a RESTful API for managing tasks.
*   **`webserver`**: A secondary web server that provides an admin panel for managing projects and a development hub.
*   **`mysql`**: A MySQL database for storing project metadata.

The frontend is a single-page application built with vanilla JavaScript and styled with Tailwind CSS. It communicates with the backend via a RESTful API.

## Building and Running

The project is designed to be run with Docker.

1.  **Setup Environment**: Copy `.env.example` to `.env` and configure the following variables:

    ```env
    PROJECT_ROOT=/path/to/your/taskmaster/project
    HOST_PORT=8199
    WEB_HOST_PORT=9652
    ```

2.  **Start Services**:

    ```bash
    docker compose up -d --build
    ```

3.  **Access Applications**:

    *   **Development Hub**: `http://localhost:9652/`
    *   **Admin Panel**: `http://localhost:9652/admin.html`
    *   **Main TaskMaster**: `http://localhost:8199/`
    *   **Project-Specific**: `http://localhost:8199/{project-slug}`

## Development Conventions

### Backend

*   The backend is a FastAPI application.
*   Dependencies are managed with `pip` and are listed in `requirements.txt`.
*   The application is configured using environment variables.
*   Database models are defined in `app/database.py` using SQLAlchemy.
*   The `TaskStorage` class in `app/storage.py` is responsible for all file I/O operations.

### Frontend

*   The frontend is a single-page application built with vanilla JavaScript.
*   The UI is styled with Tailwind CSS.
*   The main HTML file is `app/static/index.html`.
*   Frontend dependencies are managed with `npm` and are listed in `package.json`.
*   Tests are written with `playwright` and can be run with `npm test`.

### Testing

The project uses `playwright` for end-to-end testing. The following scripts are available for running tests:

*   `npm test`: Run all tests.
*   `npm run test:ui`: Run tests with the Playwright UI.
*   `npm run test:headed`: Run tests in headed mode.
*   `npm run test:debug`: Run tests in debug mode.
