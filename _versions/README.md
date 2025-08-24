# taskmasterweb

A minimal web UI to add tasks into your project's Taskmaster directory.
It writes to `.taskmaster/tasks/tasks.json` (or falls back to `taskmaster/...`)
and uses `.taskmaster/state.json` to determine the current tag unless you override it.

## Features
- Single HTML page to add a task (title, description, priority, status, due date, optional tag).
- Writes tasks under the current tag defined in `state.json`.
- Robust JSON reader that can recover from minor file corruption (strips stray bytes outside the top-level JSON object).
- Dockerized; you choose the host port and project path via `.env`.
- No external DB — the project itself remains the source of truth.

## Quickstart

1. Create a `.env` next to `docker-compose.yml` from the example:

   ```bash
   cp .env.example .env
   # edit .env
   ```

   Set:
   - `HOST_PORT=8099` (or any free port)
   - `PROJECT_ROOT=/absolute/path/to/your/project` (this folder must contain `.taskmaster` or `taskmaster`)

2. Build and start:

   ```bash
   docker compose up -d --build
   ```

3. Open: `http://localhost:8099/` (replace `8099` if you changed `HOST_PORT`).

4. Check "Storage info" box on the page to confirm correct paths and `current_tag`.

## API

- `GET /health` → `{"ok": true}`
- `GET /info` → basic info with resolved paths and `current_tag`
- `POST /task` with JSON body:
  ```json
  {
    "title": "Write a killer README",
    "description": "Explain setup, UI, and CLI integration plan.",
    "priority": "high",
    "status": "todo",
    "due_date": "2025-09-30",
    "tag": "atlas"
  }
  ```

## Notes

- The service prefers `.taskmaster/` but will fall back to `taskmaster/` if the former is absent.
- If neither exists, it will create `.taskmaster/` structure on first write.
- The JSON writer is atomic (writes to a temp file then replaces the original).

## Integrating with task-master-ai CLI (Later)
This initial version only writes tasks to the task file. You can later have an agent or a sidecar
process that invokes the CLI to pull/process tasks. For now, keep the source-of-truth as files inside
the mounted project to make it simple and transparent.
