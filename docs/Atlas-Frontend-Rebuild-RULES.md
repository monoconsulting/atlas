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

# Part 2 — Tasks & Subtasks (Execution Plan)

## Task 1 — Backup and Clean Slate

- **Subtasks**
  1. Create `/_backup/frontend_YYYYMMDD_HHMMSS/`.
  2. Move legacy frontend files there:
      `app/static/index.html`, `app/static/js/` (whole folder), `web/` (whole folder), and any other frontend assets except `app/static/tailwind.css`.
  3. Write `BACKUP_NOTES.txt` describing what was removed and why (“eliminate Loading… and workspace ambiguity”).
  4. Verify originals are gone (except `tailwind.css`).

## Task 2 — Docker & Env De-ambiguation

- **Subtasks**
  1. In `docker-compose.yml`, mount exactly one volume for projects:
      `- "${PROJECTS_HOST_DIR}:/projects"`. Remove any `/workspace` mounts.
  2. In `.env`, set `PROJECTS_HOST_DIR=<absolute host path>`; remove frontend “workspace”/path vars.
  3. In DB, set `projects.path=/projects/{slug}` for every project.
  4. Rebuild & run containers; `GET /{slug}/tasks` must return 200 with data (or an empty array shape).

## Task 3 — Minimal HTML Shell

- **Subtasks**
  1. Create a new `app/static/index.html`.
  2. Header (dark blue): **“Atlas – {projectName}”**, right-aligned header counters container `data-testid="header-counters"`.
  3. **Remove Advanced Filters** block entirely.
  4. Add a single filter row (same dark blue) with `data-testid="filter-bar"` and **exact order** of controls:
     - `data-testid="filter-status"`
     - `data-testid="filter-priority"`
     - `data-testid="filter-tags"`
     - `data-testid="filter-sorting"`
     - `data-testid="filter-search"`
  5. Above the filter row, add buttons: **Create New Task**, **Create New Status**, **Create New Tag**.
  6. Add Kanban container; no literal “Loading” text in DOM. Include a spinner overlay `data-testid="spinner"` hidden by default; show/hide via JS.

## Task 4 — JS Module Scaffolding

- **Subtasks**
  1. Create exactly four ES modules under `app/static/js/`:
     - `api.js` (wraps the API routes from Rules §3)
     - `state.js` (in-memory state: slug, currentTag, tasks, filters, sorting)
     - `render.js` (pure render functions: header counters, filters, columns, modals)
     - `main.js` (bootstrap: detect slug, fetch info/tasks, wire events)
  2. No other global helpers. No string-replace URL hacks; always call `/{slug}/…`.
  3. No “workspace” references.

## Task 5 — Dynamic Statuses & Header Counters

- **Subtasks**
  1. After fetching tasks, compute present statuses and order by the mapping in Rules §2.
  2. Render **all** columns (empty allowed) with `data-testid="column-<key>"`.
  3. Render header counters with `data-testid="counter-<key>"`, numbers must reflect current filters.
  4. Keep counts synced after any create/update.

## Task 6 — Filters (Functional)

- **Subtasks**
  1. Implement client-side filters: Status (multi), Priority (low/medium/high, multi), Tags (from distinct `labels[]`, multi), Sorting (deterministic), Search (title/description).
  2. Filter pipeline: `allTasks → status → priority → tags → search → sort → render`.
  3. Ensure counts and visible cards reflect the active filters.

## Task 7 — Create New Task Modal (with Subtasks)

- **Subtasks**
  1. Implement Create modal `data-testid="task-modal"` with fields in Rules §4.
  2. On first **+ Add Subtask**:
     - If parent not persisted: `POST /task` (get `id`), then `POST /task/{id}/subtask`.
     - Render `data-testid="subtask-row-1"`.
  3. On each subsequent **+ Add Subtask**:
     - Persist the open subtask row (POST/PUT), then append the next row.
     - Enforce **max 8**; disable button at 8 with tooltip “Max 8 subtasks per task”.
  4. **Save Task** persists parent (PUT) and any open subtask row (PUT) then closes the modal.
  5. **Cancel** or outside click: close modal and **discard unsaved** inputs; reopening shows an empty form.

## Task 8 — Edit Modals (Tasks & Subtasks)

- **Subtasks**
  1. Clicking a card opens Edit modal (same form).
  2. Allow editing parent and each subtask row; persist via PUT.
  3. Outside click cancels unsaved edits.

## Task 9 — Error Handling (No Infinite Loading)

- **Subtasks**
  1. Show `data-testid="spinner"` on any fetch start; hide on completion or error.
  2. On error, show `data-testid="error-banner"` (red, inline).
      The word **“Loading” must never remain visible** after fetch resolution.
  3. Log errors to console for diagnosis.

## Task 10 — Legacy Removal & Verification

- **Subtasks**
  1. Ensure **no** Advanced Filters markup/js remains.
  2. Ensure **no** “workspace” strings remain.
  3. Ensure **no** “browse to JSON” controls remain.
  4. Confirm only the four JS modules exist and are used.

## Task 11 — Playwright Setup (Headless-Only, Loop Until 100%)

- **Subtasks**
  1. Configure Playwright for **Chromium/headless only**; forbid headed runs.
  2. Save artifacts: screenshots, videos, traces, HTML report in a timestamped location.
  3. Provide a simple loop script (local/CI) that **re-runs until 100% pass**.
     - If a test fails: **fix the app**, do **not** change tests or input data.
  4. In CI, always upload artifacts and the HTML report.

## Task 12 — Data-TestIDs Wiring

- **Subtasks**
  1. Add all exact `data-testid` attributes listed in Rules §6.
  2. Verify they exist in DOM after load.

## Task 13 — Acceptance Verification

- **Subtasks**
  1. Visit `/{slug}`; verify header “Atlas – …”, live counters, dynamic columns.
  2. Create a task, add 2 subtasks, reload; both subtasks must be present.
  3. Apply filters; verify counts and visible cards change correctly.
  4. Compare “All filters” visible card count with `tasks.json` count; must match.
  5. Verify no “workspace” text and no “Advanced Filters” element.

## Task 14 — Deliverables

- **Subtasks**
  1. New `app/static/index.html`; `app/static/js/api.js`, `state.js`, `render.js`, `main.js`.
  2. Updated `docker-compose.yml` and `.env` (as per Rules §7).
  3. Reports directory with HTML report(s) and an index page linking historical runs.
  4. `VERIFICATION.md` listing each Acceptance Criteria with a one-line PASS and evidence.

## Task 15 — Gate to Done

- **Subtasks**
  1. **All** UI Acceptance Criteria pass.
  2. Playwright suite passes **100%** in headless.
  3. Artifacts and HTML report(s) exist and are linked from the report index. All buttons that links to video, trace, summary or playwright must work.
  4. No tests or input data were modified to achieve green.

------

**Reminder:** Headless is **mandatory**; **100% success** is the only acceptable outcome; **no modifications** to tests or input data (e.g., `tasks.json`) are ever allowed.