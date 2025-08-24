# taskmasterweb

A minimal web UI to add tasks and subtasks into your project's Taskmaster directory.
It writes to `.taskmaster/tasks/tasks.json` (or falls back to `taskmaster/...`)
and uses `.taskmaster/state.json` to determine the current tag unless you override it.

## Features
- HTML page to add a task (title, description, priority, status, due date, optional tag).
- Adds **subtasks** to an existing task by parent task ID (IDs are unique within parent).
- Lists tasks in the current tag and shows how many subtasks each has.
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

4. Check "Storage info" to confirm correct paths and `current_tag`.

## API

- `GET /health` → `{"ok": true}`
- `GET /info` → basic info with resolved paths and `current_tag`
- `GET /tasks?tag=atlas` → list tasks for a tag (defaults to current tag)
- `POST /task`
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
- `POST /task/{task_id}/subtask`
  ```json
  {
    "parent_id": 12,
    "title": "Draft outline",
    "description": "Create headings and structure",
    "status": "in-progress",
    "due_date": "2025-10-01",
    "tag": "atlas"
  }
  ```

## Notes

- The service prefers `.taskmaster/` but will fall back to `taskmaster/` if the former is absent.
- If neither exists, it will create `.taskmaster/` structure on first write.
- Task IDs are unique per tag. Subtask IDs are unique within their parent.
- The JSON writer is atomic (writes to a temp file then replaces the original).
