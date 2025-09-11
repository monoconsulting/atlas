import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Ensure repo root in path
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.storage import TaskStorage  # uses streaming + atomic writes


CANON_STATUSES = {"todo", "pending", "in-progress", "review", "done", "deferred", "cancelled"}
STATUS_ALIASES = {
    "planned": "pending",
    "backlog": "pending",
    "in_progress": "in-progress",
    "inprogress": "in-progress",
}
CANON_PRIOS = {"low", "medium", "high"}


def norm_status(s: Any) -> str:
    if s is None:
        return "todo"
    v = str(s).strip().lower()
    v = STATUS_ALIASES.get(v, v)
    return v if v in CANON_STATUSES else "todo"


def norm_priority(p: Any) -> str:
    if p is None:
        return "medium"
    v = str(p).strip().lower()
    return v if v in CANON_PRIOS else "medium"


def as_labels(v: Any) -> List[str]:
    if not v:
        return []
    if isinstance(v, list):
        return [str(x) for x in v if x is not None]
    return [str(v)]


def as_dependencies(v: Any) -> List[Any]:
    if not v:
        return []
    out = []
    if not isinstance(v, list):
        v = [v]
    for x in v:
        if x is None:
            continue
        # keep dotted ids as string, numeric as int
        sx = str(x)
        if "." in sx:
            out.append(sx)
        else:
            try:
                out.append(int(sx))
            except Exception:
                out.append(sx)
    return out


def ensure_iso(ts: Any) -> str:
    # leave existing if truthy; API fills if missing
    return str(ts) if ts else ""


def repair_subtasks(subs: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[Any, int]]:
    seen = set()
    remap: Dict[Any, int] = {}
    next_id = 1
    fixed: List[Dict[str, Any]] = []
    for st in subs or []:
        sid = st.get("id")
        try:
            sid_int = int(str(sid).split(".")[-1])
        except Exception:
            sid_int = None
        if sid_int is None or sid_int in seen:
            sid_int = next_id
            remap[sid] = sid_int
        seen.add(sid_int)
        next_id = max(next_id, sid_int + 1)
        fixed.append({
            "id": sid_int,
            "title": st.get("title") or "Untitled",
            "description": st.get("description") or "",
            "prompt": st.get("prompt") or st.get("system_prompt"),
            "status": norm_status(st.get("status")),
            "priority": norm_priority(st.get("priority")),
            "due_date": st.get("due_date") or None,
            "assigned_to": st.get("assigned_to") or None,
            "estimate": st.get("estimate") or None,
            "labels": as_labels(st.get("labels")),
            "dependencies": as_dependencies(st.get("dependencies")),
            "updated_at": ensure_iso(st.get("updated_at")),
            "created_at": ensure_iso(st.get("created_at")),
        })
    return fixed, remap


def repair_tasks(tag_tasks: List[Dict[str, Any]], repair_ids: bool) -> Tuple[List[Dict[str, Any]], Dict[Any, Any]]:
    seen: set = set()
    remap: Dict[Any, Any] = {}
    # find next id
    mx = 0
    for t in tag_tasks:
        try:
            mx = max(mx, int(str(t.get("id")).split(".")[-1]))
        except Exception:
            pass
    next_id = mx + 1

    fixed: List[Dict[str, Any]] = []
    for t in tag_tasks:
        tid = t.get("id")
        key = None
        try:
            key = int(str(tid).split(".")[-1])
        except Exception:
            key = None
        if (key is None or key in seen) and repair_ids:
            remap[tid] = next_id
            key = next_id
            next_id += 1
        if key is None:
            # fallback to 1-based append but keep original for display
            key = next_id
            next_id += 1
        seen.add(key)

        subtasks, st_remap = repair_subtasks(t.get("subtasks") or [])
        # No known references from parent dependencies to subtasks, so only remap within subtasks

        deps = as_dependencies(t.get("dependencies"))
        fixed.append({
            "id": key,
            "title": t.get("title") or f"Task {key}",
            "description": t.get("description") or "",
            "prompt": t.get("prompt") or t.get("system_prompt"),
            "status": norm_status(t.get("status")),
            "priority": norm_priority(t.get("priority")),
            "due_date": t.get("due_date") or None,
            "assigned_to": t.get("assigned_to") or None,
            "estimate": t.get("estimate") or None,
            "labels": as_labels(t.get("labels")),
            "dependencies": deps,
            "relations": list(deps),
            "subtasks": subtasks,
            "deleted": bool(t.get("deleted", False)),
            "updated_at": ensure_iso(t.get("updated_at")),
            "created_at": ensure_iso(t.get("created_at")),
            "tag": t.get("tag") or "master",
        })
    return fixed, remap


def repair(base: str | Path, tag: str = None, repair_ids: bool = False, dry_run: bool = False) -> Dict[str, Any]:
    ts = TaskStorage(base_dir=str(base))
    merged = ts.ensure_tasks_struct()
    tags = [tag] if tag else list(merged.keys())

    out: Dict[str, Any] = {}
    id_changes: Dict[str, Dict[Any, Any]] = {}
    for tg in tags:
        tasks = (merged.get(tg) or {}).get("tasks", [])
        fixed, remap = repair_tasks(tasks, repair_ids=repair_ids)
        out[tg] = {"tasks": fixed}
        if remap:
            id_changes[tg] = remap

    if dry_run:
        return {"ok": True, "id_changes": id_changes, "preview_tags": list(out.keys())}

    # Atomic write via storage helper
    ts._write_json(ts.tasks_file, out)  # type: ignore
    return {"ok": True, "id_changes": id_changes, "written": str(ts.tasks_file)}


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Validate and repair Taskmaster tasks file to canonical schema")
    ap.add_argument("base", help="Project slug, .taskmaster dir, or tasks file directory")
    ap.add_argument("--tag", help="Specific tag to repair (default: all)")
    ap.add_argument("--repair-ids", action="store_true", help="Reassign duplicate/invalid IDs within tag")
    ap.add_argument("--dry-run", action="store_true", help="Validate only; do not write")
    args = ap.parse_args()

    base = args.base
    # Accept slug or path; let TaskStorage resolve slug→path
    result = repair(base, tag=args.tag, repair_ids=args.repair_ids, dry_run=args.dry_run)
    print(result)


if __name__ == "__main__":
    sys.exit(main())

