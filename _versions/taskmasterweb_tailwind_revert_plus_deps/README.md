# taskmasterweb

Tailwind-based web UI to add/list/edit tasks and subtasks in your Taskmaster directory.

This version reverts to **left-side Add Task** (no modal) and **Add Subtask** box directly
underneath. The header shows a small "Works with /workspace..." line under the title.
The right side lists clickable task cards. Each card shows `assigned` and `deps` in the
bottom-right, and the whole card opens the **Edit Task** modal.

## Dependencies
Tasks and subtasks now support a `dependencies: number[]` field. For backward
compatibility the tasks also mirror this field to `relations` in JSON.

## UI Highlights
- Header: *Task Master AI — {project_name}* with a small line describing storage behavior.
- Left: **Add Task** (with dependencies multi-select) and **Add Subtask** (with dependencies).
- Right: task cards colored by priority (high=red, medium=orange, low=neutral). Entire card is clickable.
  Bottom-right shows assignee and dependencies.
- Edit modal adopts the priority color theme. Inside the modal:
  - Edit task form
  - **Recently added subtasks** (appears between the form and add-subtask form)
  - Add Subtask form (with dependencies)
  - Existing subtasks list (inline edit; includes dependencies picker)
- Clicking outside the modal closes it.

## API
- `GET /info`, `GET /tasks`, `GET /task/{id}`
- `POST /task` accepts: `assigned_to`, `estimate`, `labels: string[]`, `dependencies: number[]`
- `PATCH /task/{id}` updates same fields
- `POST /task/{id}/subtask` accepts: `assigned_to`, `estimate`, `labels`, `dependencies`
- `PATCH /task/{id}/subtask/{sid}` updates same subtask fields

## Env
- `PROJECT_NAME` (optional) — override the name shown in the header.
