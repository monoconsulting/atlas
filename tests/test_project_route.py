import os
import sys
import tempfile
import shutil
import json
from fastapi.testclient import TestClient

# Ensure workspace root is on sys.path so "app" package imports correctly in test runner
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.main import app

client = TestClient(app)


def make_project_dir():
    td = tempfile.mkdtemp(prefix="tm_project_")
    task_dir = os.path.join(td, ".taskmaster", "tasks")
    os.makedirs(task_dir, exist_ok=True)
    tasks_file = os.path.join(task_dir, "tasks.json")
    # Minimal tasks structure
    with open(tasks_file, "w", encoding="utf-8") as f:
        json.dump({"master": {"tasks": []}}, f)
    return td


def test_project_page_and_tasks_endpoint():
    project_path = make_project_dir()
    try:
        payload = {
            "slug": "fortigatelog",
            "name": "Fortigate Log",
            "path": project_path,
            "description": "Temp project for test",
            "active": True
        }
        # Create project via API
        resp = client.post("/api/projects", json=payload)
        assert resp.status_code == 200, f"create project failed: {resp.text}"
        body = resp.json()
        assert body.get("ok") is True

        # Request the project page (should return index HTML quickly)
        page = client.get("/fortigatelog")
        assert page.status_code == 200
        assert "Fortigate Log" in page.text or "TASK-MASTER-AI" in page.text

        # Request the tasks API for the project
        tasks_resp = client.get("/fortigatelog/tasks")
        assert tasks_resp.status_code == 200
        tasks_body = tasks_resp.json()
        assert tasks_body.get("ok") is True
        assert isinstance(tasks_body.get("data"), list)
    finally:
        # cleanup created project dir
        shutil.rmtree(project_path, ignore_errors=True)