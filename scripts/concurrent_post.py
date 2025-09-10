import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
except Exception as e:
    print("Missing dependency 'requests':", e)
    raise

POST_URL = "http://localhost:8199/task"
TASKS_URL = "http://localhost:8199/tasks"

def post_task(i):
    title = f"smoke-{int(time.time())}-{i}-{uuid.uuid4().hex[:6]}"
    payload = {"title": title, "description": "smoke test"}
    start = time.perf_counter()
    try:
        r = requests.post(POST_URL, json=payload, timeout=10)
        elapsed = time.perf_counter() - start
        return {"index": i, "status": r.status_code, "body": r.text, "time_s": elapsed, "title": title}
    except Exception as exc:
        elapsed = time.perf_counter() - start
        return {"index": i, "error": str(exc), "time_s": elapsed, "title": title}

def main():
    results = []
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = [ex.submit(post_task, i) for i in range(5)]
        for fut in as_completed(futures):
            results.append(fut.result())
    print(json.dumps({"posts": results}, indent=2))

    # If no errors, fetch tasks and validate
    any_errors = any("error" in r for r in results)
    try:
        r = requests.get(TASKS_URL, timeout=10)
        tasks = r.json() if r.status_code == 200 else None
        print("GET /tasks HTTP_STATUS:", r.status_code)
        print("GET /tasks BODY:", json.dumps(tasks, indent=2))
        if isinstance(tasks, list):
            ids = [t.get("id") for t in tasks if "id" in t]
            unique = len(ids) == len(set(ids))
            print("TASK_IDS_COUNT:", len(ids))
            print("TASK_IDS_UNIQUE:", unique)
        else:
            print("TASKS_RESPONSE_NOT_LIST")
    except Exception as exc:
        print("GET /tasks ERROR:", str(exc))

if __name__ == "__main__":
    main()