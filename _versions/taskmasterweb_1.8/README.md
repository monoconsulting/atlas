# taskmasterweb

Tailwind + FastAPI UI to add/list/edit Taskmaster tasks & subtasks
inside a mounted project (`/workspace/.taskmaster`, fallback `/workspace/taskmaster`).

## Quick start
1) Copy `.env.example` to `.env` and set:
   - `HOST_PORT` (default 8099)
   - `PROJECT_ROOT` to your absolute project path

2) Run:
```bash
docker compose up -d --build
```

3) Open: `http://localhost:8099` (or your chosen port).

