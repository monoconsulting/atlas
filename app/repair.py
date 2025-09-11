from __future__ import annotations
from typing import Dict, Any, List, Tuple

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
    out: List[Any] = []
    if not isinstance(v, list):
        v = [v]
    for x in v:
        if x is None:
            continue
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
        try:
            key = int(str(tid).split(".")[-1])
        except Exception:
            key = None
        if (key is None or key in seen) and repair_ids:
            remap[tid] = next_id
            key = next_id
            next_id += 1
        if key is None:
            key = next_id
            next_id += 1
        seen.add(key)
        subtasks, st_remap = repair_subtasks(t.get("subtasks") or [])
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


def repair_merged(merged: Dict[str, Any], repair_ids: bool = False) -> Tuple[Dict[str, Any], Dict[str, Dict[Any, Any]]]:
    out: Dict[str, Any] = {}
    id_changes: Dict[str, Dict[Any, Any]] = {}
    for tag, payload in (merged or {}).items():
        fixed, remap = repair_tasks((payload or {}).get("tasks", []), repair_ids=repair_ids)
        out[tag] = {"tasks": fixed}
        if remap:
            id_changes[tag] = remap
    return out, id_changes

