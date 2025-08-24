# taskmasterweb

Tailwind-based web UI to add/list/edit tasks and subtasks in your Taskmaster directory.
Now supports **assigned_to**, **labels**, **estimate**, **relations**, and modal views
for **Add Task** and **Edit Task**.

## Highlights
- Responsive two/three-column layout with rounded cards.
- Cards show status/priority/due/assigned/estimate/labels/relations.
- Click **status** or **priority** pills to change quickly. Card gets **red** for `high`, **orange** for `medium`.
- **Add Task** modal supports composing subtasks before creating the task (buffered and posted after task is created).
- **Edit Task** modal with full fields and inline subtask editing + add new subtask.
- API preserves file-based source-of-truth under `.taskmaster/tasks/tasks.json` (fallback `taskmaster/...`).

## API (additions)
- `POST /task` accepts: `assigned_to`, `estimate`, `labels: string[]`, `relations: number[]`
- `PATCH /task/{id}` updates: `assigned_to`, `estimate`, `labels`, `relations`
- Subtasks `POST`/`PATCH` accept: `assigned_to`, `estimate`, `labels`

## Env
- `PROJECT_NAME` (optional) — override the name shown in the header.
