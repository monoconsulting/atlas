# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Build Patterns

- **Tailwind CSS compiled in Docker only**: No local build - CSS compiled during `docker build` using binary download, not CDN
- **Multi-container architecture**: Main app (8199), webserver (9652), MySQL (3306) - NOT a single service
- **Project-specific storage**: Each project slug creates isolated TaskStorage with custom base_dir, bypassing env vars
- **Dual task file support**: Merges both `.taskmaster/tasks/tasks.json` AND root `tasks.json` with duplicate ID detection

## Critical File Patterns

- **Atomic JSON writes**: All JSON operations use temp files (`path.with_suffix(".tmp")`) then replace - never direct writes
- **Soft deletes only**: Tasks marked `deleted: true`, never removed from JSON (prevents data loss)
- **Large file streaming**: Files >100KB use `ijson` streaming parser, not `json.loads()`
- **Event propagation prevention**: ALL subtask buttons must use `e.stopPropagation()` to prevent modal closure

## API Route Discovery

- **Dynamic project routing**: `/{project_slug}/task` creates project-specific TaskStorage instances
- **HTML content injection**: Project routes modify index.html content dynamically, replacing API URLs
- **CORS origins from HOST_PORT**: Dynamic CORS configuration based on environment variables

## Test Configuration

- **Single worker only**: `workers: 1` in playwright config prevents race conditions
- **Non-parallel execution**: `fullyParallel: false` - required for task creation/deletion tests
- **Custom test reports**: Reports go to `web/test-reports/` for development hub integration

## Storage Quirks

- **ID generation**: Auto-incrementing within tag scope, handles both numeric and dotted IDs
- **State file fallback**: Uses `/workspace/taskmaster` if `/workspace/.taskmaster` missing
- **Error recovery**: JSON parsing includes partial recovery from corrupted files
- **Duplicate handling**: Silently skips duplicate task IDs during file merging

## Concurrency and CI

- Concurrency test harness: pytest-based concurrent write test added at [`tests/test_concurrent_writes.py`](tests/test_concurrent_writes.py:1). It spawns multiple processes that call TaskStorage.add_task against the same base_dir to validate locking.
- Manual smoke script: [`scripts/concurrent_post.py`](scripts/concurrent_post.py:1) is available for quick manual verification against a running service (docker-compose up -d).
- Storage implementation: See the portalocker-based locking and streaming logic in [`app/storage.py`](app/storage.py:1). Key artifacts:
  - `_file_lock()` provides cross-process exclusive locking with retry/backoff.
  - `_read_json_streaming()` uses `ijson.kvitems` for top-level mapping streaming.
  - `_write_json()` performs atomic tmp -> replace writes.

CI workflow:
- A GitHub Actions workflow was added to run the concurrency test on pushes and pull requests: `.github/workflows/concurrency.yml`.
- CI installs test dependencies (pytest, requests) and runs `pytest -q tests/test_concurrent_writes.py` to catch regressions in lock behavior.

Operational guidance:
- Manual smoke run:
  1. Start containers: `docker-compose build --no-cache && docker-compose up -d`
  2. Run manual concurrent verifier: `python scripts/concurrent_post.py`
  3. Inspect app logs for `[TaskStorage] acquired lock` / `released lock` and any `parsing_errors`.
- If CI or manual tests report LockException retries exceeded:
  - Check container logs for repeated `failed to acquire lock` messages and timestamps.
  - Increase `_file_lock` timeout or retries temporarily to triage.
  - For sustained contention, consider migrating to a DB-backed TaskStorage (see `app/database.py`) as a long-term solution.

Notes:
- Requirements updated to include `pytest` and `requests` to support the harness and smoke script.
- Keep `LARGE_FILE_THRESHOLD` and streaming behavior under observation when files approach >1MB; adjust thresholds if necessary.