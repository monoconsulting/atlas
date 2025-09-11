import os
import sys
import re
from typing import Dict, List, Tuple

# Ensure repo root on sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from app.storage import TaskStorage
from app.models import AddTaskRequest, AddSubTaskRequest, UpdateTaskRequest


PHASE_ORDER = ["A", "B", "C", "D"]


def normalize_status(s: str | None) -> str:
    if not s:
        return "todo"
    s = str(s).strip().lower()
    if s in ("in_progress", "inprogress"):
        return "in-progress"
    if s == "backlog":
        return "pending"
    return s


def detect_phase_from_title(title: str) -> str | None:
    if not title:
        return None
    m = re.match(r"^([A-D])\s*\d", title.strip(), flags=re.IGNORECASE)
    if m:
        return m.group(1).upper()
    # Also support formats like "A1.1 - ..." or "A1 – ..."
    m = re.match(r"^([A-D])\s*\d", title.strip().replace("–", "-") , flags=re.IGNORECASE)
    if m:
        return m.group(1).upper()
    return None


def pick_parent_status(subtasks: List[dict]) -> str:
    # If any in-progress/review -> in-progress; else if any todo/pending -> todo; else if all done -> done
    statuses = {normalize_status(st.get("status")) for st in subtasks}
    if any(s in {"in-progress", "review"} for s in statuses):
        return "in-progress"
    if any(s in {"todo", "pending"} for s in statuses):
        return "todo"
    if statuses == {"done"}:
        return "done"
    # fallback
    return (list(statuses)[0] if statuses else "todo")


def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/split_task_into_phases.py <project_slug> <task_id>")
        return 2

    slug = sys.argv[1]
    task_id = int(sys.argv[2])

    # Ensure dual-write if available
    os.environ.setdefault("ATLAS_DB_DUAL_WRITE", "1")

    # Resolve base_dir using PROJECTS_HOST_DIR for reliability on host
    host_projects = os.getenv("PROJECTS_HOST_DIR") or os.getenv("PROJECTS_DIR") or "E:/projects"
    base_dir = os.path.join(host_projects, slug, ".taskmaster")
    if not os.path.isdir(base_dir):
        print(f"[split] WARNING: {base_dir} not found, falling back to slug-based resolution (may require DB)")
        storage = TaskStorage(base_dir=slug)
    else:
        storage = TaskStorage(base_dir=base_dir)

    src = storage.get_task(task_id=task_id, tag="master")
    if not src:
        print(f"[split] Task id {task_id} not found in project '{slug}'")
        return 1

    original_title = src.get("title") or f"Task {task_id}"
    original_desc = src.get("description") or ""
    original_priority = src.get("priority") or "medium"
    original_prompt = src.get("prompt")

    subtasks = list(src.get("subtasks") or [])
    groups: Dict[str, List[dict]] = {k: [] for k in PHASE_ORDER}
    for st in subtasks:
        phase = detect_phase_from_title(st.get("title", ""))
        if phase and phase in groups:
            groups[phase].append(st)

    created: List[Tuple[str, int]] = []
    for phase in PHASE_ORDER:
        phase_subs = groups.get(phase) or []
        if not phase_subs:
            continue
        # Create parent task for this phase
        parent_status = pick_parent_status(phase_subs)
        title = f"{original_title} – Fas {phase}"
        desc = f"Utbryten fas {phase} från TM{task_id}.\n\n{original_desc}".strip()

        add_req = AddTaskRequest(
            title=title,
            description=desc,
            prompt=original_prompt,
            priority=original_priority,
            status=parent_status,
            tag="master",
        )
        new_parent = storage.add_task(add_req)
        parent_id = int(new_parent.id)
        created.append((phase, parent_id))

        # Add subtasks
        for st in phase_subs:
            st_title = st.get("title") or "Subtask"
            st_desc = st.get("description") or ""
            # Preserve acceptanceCriteria if present
            ac = st.get("acceptanceCriteria")
            if ac:
                st_desc = (st_desc + "\n\nAcceptanskriterier:\n" + str(ac)).strip()

            st_req = AddSubTaskRequest(
                parent_id=parent_id,
                title=st_title,
                description=st_desc,
                prompt=st.get("prompt"),
                status=normalize_status(st.get("status")),
                priority=st.get("priority") or "medium",
                tag="master",
            )
            storage.add_subtask(st_req)

    # Update original task: mark deferred and annotate
    if created:
        refs = ", ".join([f"{ph}: TM{pid}" for ph, pid in created])
        note = f"\n\n[Split] Denna uppgift har brutits ut i faser: {refs}"
        upd = UpdateTaskRequest(
            status="deferred",
            description=(original_desc + note).strip(),
            labels=None,
        )
        storage.update_task(task_id=task_id, req=upd)

    print("[split] Created tasks:")
    for ph, pid in created:
        print(f"  Fas {ph}: TM{pid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

