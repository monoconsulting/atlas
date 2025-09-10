Below is the rewritten **ATLAS Frontend Rebuild** brief in **English only**, structured exactly as you requested:

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