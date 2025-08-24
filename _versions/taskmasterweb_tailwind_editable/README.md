# taskmasterweb

A Tailwind-based web UI to add **tasks and subtasks**, list/filter/sort tasks,
and **edit** tasks/subtasks directly in your project's Taskmaster directory.
It writes to `.taskmaster/tasks/tasks.json` (or falls back to `taskmaster/...`)
and uses `.taskmaster/state.json` to determine the current tag unless you override it.

## Features
- Responsive Tailwind UI with rounded cards and two-column layout.
- Add Task + "Add subtasks for the newly created task".
- Right column shows task cards with filters (status, priority, tag) and default sorting: todo → in-progress → done.
- Click a card to open **Edit Task** panel with prefilled fields and a list of subtasks (inline edit).
- Robust JSON reader; atomic writes.

## API

- `GET /health`
- `GET /info`
- `GET /tasks?tag=atlas`
- `GET /task/{task_id}`
- `POST /task`
- `PATCH /task/{task_id}`
- `POST /task/{task_id}/subtask`
- `PATCH /task/{task_id}/subtask/{sub_id}`

## Quickstart
Same as before. Optional env var `PROJECT_NAME` can override the name shown in header.
