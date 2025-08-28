Below is the rewritten **ATLAS Frontend Rebuild** brief in **English only**, structured exactly as you requested:

- **Part 1 — Rules & Musts** (non-negotiable constraints and definitions)
- **Part 2 — Tasks & Subtasks** (step-by-step execution plan from clean slate to 100% green)

This fully supersedes your previous brief and shall be treated as the single source of truth. 

------

# Part 1 — Rules & Musts (Non-Negotiable)

## 1) Goal, Scope, and Prohibitions

- **Goal:** A fresh, minimal, robust frontend that renders at `http://localhost:8199/<slug>`:
  - Header text **exactly**: **Atlas – {projectName}**.
  - **No “workspace”** wording anywhere (UI, env, docs, code).
  - Dynamic **status categories** with live counters in the header (e.g., `Backlog: 44 · Todo: 3 · In progress: 1 · Done: 45 …`).
  - **Advanced Filters** section **removed entirely**.
  - Keep a single **filter/search row** (dark blue like the header) with controls in this exact order:
     **Status**, **Priority**, **Tags**, **Sorting**, **Search**.
  - Above that row, three buttons: **Create New Task**, **Create New Status**, **Create New Tag**.
  - **Kanban columns** generated **dynamically** from the statuses present (see mapping below).
  - **Subtasks flow must be correct and durable** (details in Rules §4 and Tasks §7).
  - Keep current visual palette; if any legacy visuals/scripts can re-introduce the “Loading…” bug, **remove them**.
- **Prohibitions:**
  - Do **not** modify or relax tests to get green.
  - Do **not** modify input data (e.g., `tasks.json`, fixtures, seeds) to fit the code.
  - Do **not** implement “browse to JSON file” UI; all data access is via backend endpoints.
  - Do **not** write files directly from the browser; all persistence goes through the backend (atomic writes).

## 2) Data & Status Definitions (Ground Truth)

- Canonical project data lives under the container path:

  - **`/projects/{project_slug}/.taskmaster/state.json`**

    ```json
    { "currentTag": "master" }
    ```

  - **`/projects/{project_slug}/.taskmaster/tasks/tasks.json`**
     JSON object keyed by tag (e.g., `"master"`) with `tasks: []`.

- **Allowed status keys** (backend contract):
   `todo`, `pending`, `in-progress`, `review`, `done`, `deferred`, `cancelled`

- **UI label mapping & order (use exactly this):**

  1. `pending` → **Backlog**
  2. `todo` → **Todo**
  3. `in-progress` → **In progress**
  4. `review` → **Review**
  5. `done` → **Done**
  6. `deferred` → **Deferred**
  7. `cancelled` → **Cancelled**

- Columns are **generated dynamically** from the statuses present for the current tag (show empty columns with “No tasks” if count is zero). Header counters must mirror these columns and counts.

## 3) API Contract (UI must use these; do not invent new routes)

All routes are per project slug:

- `GET /{slug}` → serves the HTML page
- `GET /{slug}/info` → project info (provides `{projectName}`)
- `GET /{slug}/tasks?tag=<optional>` → `{ ok: true, data: Task[] }` for current or requested tag
- `GET /{slug}/task/{id}?tag=<optional>`
- `POST /{slug}/task` → create parent task (returns created task with server-assigned `id`)
- `POST /{slug}/task/{taskId}/subtask` → create subtask (returns created subtask with server-assigned `id` 1..8)
- `PUT /{slug}/task/{taskId}` → update parent task
- `PUT /{slug}/task/{taskId}/subtask/{subId}` → update subtask

**All writes must go through these endpoints (atomic file locking is handled server-side).**

## 4) Subtasks & Modal Behavior (Must)

- In the **Create New Task** modal:
  - Fields: **Title** (required), Description, Priority, Status (default `todo`), Due date, Assigned to, Estimate, Labels (comma-separated → array).
  - Section title: **“Subtasks”** (no “(Optional)” anywhere).
  - **+ Add Subtask** behavior:
    - If the parent task is **not** yet persisted:
      1. `POST /{slug}/task` to obtain a server-assigned `id`.
      2. Immediately `POST /{slug}/task/{id}/subtask` to create Subtask 1.
      3. Render Subtask row 1 in the modal.
      4. Refresh in-memory tasks or re-fetch for counters.
    - On every subsequent **+ Add Subtask**:
      - Persist any open subtask row first (POST/PUT), then append a **new blank row** “Subtask N+1”.
      - Enforce **maximum 8** subtasks per task; disable the add button at 8.
  - **Save Task** persists any parent edits (PUT) and any open subtask row (PUT), then closes the modal.
  - **Cancel** or clicking outside the modal closes it and **discards all unsaved** inputs. Reopening **must** show an empty form.
- **Edit from Kanban**:
  - Clicking a card opens an Edit modal with all fields and the **Subtasks** section.
  - Edits persist via PUT. Outside click cancels and discards unsaved changes.

## 5) UI Elements That Must Not Exist

- **No** “Advanced Filters” area (remove entirely).
- **No** “workspace” text/labels anywhere (UI, env, docs).
- **No** JSON file picker/browse inputs.

## 6) Visual & Test Hooks

- Keep existing palette; apply the **same dark blue** to header and filter row.
- Provide these **data-testids** (must match exactly; required by tests):
  - Header counters container: `data-testid="header-counters"`
  - Per-counter span: `data-testid="counter-<key>"` where `<key>` is `backlog|todo|inprogress|review|done|deferred|cancelled`
  - Filter bar container: `data-testid="filter-bar"`
    - `data-testid="filter-status"`, `"filter-priority"`, `"filter-tags"`, `"filter-sorting"`, `"filter-search"`
  - Spinner overlay: `data-testid="spinner"`
  - Error banner (fetch error): `data-testid="error-banner"`
  - Columns: `data-testid="column-<key>"`
  - Cards: `data-testid="card"`
  - Task modal: `data-testid="task-modal"`
  - Subtask rows: `data-testid="subtask-row-<n>"`
  - **Do not** render `data-testid="advanced-filters"`

## 7) Docker & Environment (De-ambiguation)

- **docker-compose.yml** for the frontend service must mount a **single, canonical** host projects root:
  - `- "${PROJECTS_HOST_DIR}:/projects"` (no `/workspace` mounts anywhere)
- **.env** must define `PROJECTS_HOST_DIR=<absolute host path>`.
   Remove any frontend-side envs for “workspace” or direct file paths to `tasks.json`.
- In the database, for each project row, **`projects.path`** must be set to the **container path**:
   e.g., `/projects/transkript2`

## 8) Testing & CI Mandates

- **Headless is mandatory.** Headed runs are forbidden (machine must remain usable).

- **100% success is required.** Anything less is **rejected**.
   CI/local scripts must **loop** and re-run until **all** tests pass.
   You may fix **application code** only; you may **not** modify tests or input data.

- **Never change tests** to achieve green.

- **Never change input data** (e.g., `tasks.json`, fixtures) to fit your code.

- **Artifacts must be saved** for every run: screenshots, videos, traces, HTML report, and an index page linking historical runs.

- **Pass/Fail gates:**

  - Any visible “Loading” after data fetch ⇒ **FAIL**

  - Missing header counters or dynamic columns ⇒ **FAIL**

  - Create → `+ Add Subtask` failing to persist parent first ⇒ **FAIL**

  - > 8 subtasks allowed ⇒ **FAIL**

  - “All-filters” visible card count ≠ `tasks.json` count ⇒ **FAIL**

  - Any “workspace” text or any “Advanced Filters” element ⇒ **FAIL**

  - No HTML report or missing report index link ⇒ **FAIL**

## 9) Code Hygiene & Backup

- Replace files **fully** (no partial edits).
- Do **not** touch unrelated areas.
- Remove dead/legacy JS that can cause the “Loading…” stall.
- Before removal, **backup** removed frontend assets into:
   `/_backup/frontend_YYYYMMDD_HHMMSS/` with a `BACKUP_NOTES.txt` explaining what/why.

------
