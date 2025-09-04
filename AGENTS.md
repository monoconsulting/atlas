# Repository Guidelines

## Project Structure & Modules
- `app/`: Service logic and storage (`app/storage.py`, optional `app/database.py`).
- `web/`: Frontend assets; `index.html` is dynamically patched per project.
- `tests/`: Concurrency test `tests/test_concurrent_writes.py`.
- `scripts/`: Smoke utilities like `scripts/concurrent_post.py`.
- `.github/workflows/`: CI (`concurrency.yml`).

## Build, Test, and Development
- Build/run (multi-container): `docker-compose build --no-cache && docker-compose up -d`
  - Ports: app `8199`, webserver `9652`, MySQL `3306`.
- Tailwind CSS: compiled only during Docker build via binary download (no local build).
- Concurrency test: `pytest -q tests/test_concurrent_writes.py`.
- Manual smoke: `python scripts/concurrent_post.py` against running containers.

## Coding Style & Conventions
- Python: PEP 8, 4-space indent, `snake_case` for functions/variables; modules lowercase.
- JSON storage (critical):
  - Atomic writes via temp files (`.tmp`) then replace; never direct writes.
  - Soft deletes: set `{"deleted": true}`; never remove tasks.
  - Large files (>100KB): parse with `ijson` streaming, not `json.loads()`.
  - ID rules: auto-increment within tag scope; support numeric and dotted IDs.
  - File merge: combine `.taskmaster/tasks/tasks.json` and root `tasks.json`; silently skip duplicates.

## Testing Guidelines
- Framework: `pytest` for storage/concurrency. Playwright config uses single worker and non-parallel runs; reports under `web/test-reports/`.
- Naming: test files `test_*.py`; co-locate with `tests/`.
- Run targeted tests before pushing; include cases for lock contention and recovery.

## Commit & Pull Request Guidelines
- Commits: imperative mood with scope (e.g., `storage: fix atomic write retry`).
- PRs: clear description, linked issues, reproduction steps, and screenshots/logs when UI/storage behavior changes.
- CI must pass (concurrency test included). Explain any changes to locking or file thresholds.

## Architecture & Ops Notes
- Multi-container architecture; dynamic routing per project at `/{project_slug}/task`.
- CORS derives from `HOST_PORT`; verify envs in Docker.
- Storage base dir is per-project; fallback to `/workspace/taskmaster` if `/workspace/.taskmaster` missing.
- Locking via `portalocker`: `_file_lock()` with retry/backoff. If contention occurs, inspect logs for "acquired/released lock" and consider increasing timeout; for sustained needs, evaluate DB-backed `TaskStorage`.

## Frontend Safety
- Prevent modal closures: all subtask buttons must call `e.stopPropagation()`.

