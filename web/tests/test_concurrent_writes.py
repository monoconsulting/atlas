import multiprocessing
import time
import os
import pytest

from app.storage import TaskStorage
from app.models import AddTaskRequest

def worker(base_dir, index, q):
    try:
        ts = TaskStorage(base_dir=base_dir)
        req = AddTaskRequest(title=f"concurrent-{index}", description="concurrent", priority="medium", status="pending")
        t = ts.add_task(req)
        # t may be a Task object or dict depending on implementation
        if hasattr(t, "id"):
            q.put(int(t.id))
        elif isinstance(t, dict):
            q.put(int(t.get("id")))
        else:
            q.put(int(t))
    except Exception as e:
        q.put(f"err:{e}")

def test_concurrent_process_writes(tmp_path):
    base = tmp_path / "taskmaster"
    base.mkdir()
    base_dir = str(base)
    q = multiprocessing.Queue()
    procs = []
    N = 8

    for i in range(N):
        p = multiprocessing.Process(target=worker, args=(base_dir, i, q))
        p.start()
        procs.append(p)

    for p in procs:
        p.join(timeout=15)

    ids = []
    while not q.empty():
        ids.append(q.get())

    numeric_ids = [i for i in ids if isinstance(i, int)]
    assert len(numeric_ids) == N, f"Expected {N} numeric ids, got {ids}"
    assert len(set(numeric_ids)) == N, f"IDs not unique: {numeric_ids}"