# Smoke Verification Report - taskmasterweb

- Workspace: [`e:/projects/taskmasterweb`](e:/projects/taskmasterweb:1)
- Start script: [`TMW-docker-build.bat`](TMW-docker-build.bat:1)
- Concurrent script: [`scripts/concurrent_post.py`](scripts/concurrent_post.py:1)

Verdict: failed

Summary:
Root cause identified earlier: missing ijson version + pip failure (noted in prior investigations). Observed behavior: application responded to GET /health but concurrent POST /task requests timed out (all 5). Logs show uvicorn started; pip reported successful installs during image build.

Steps performed and commands run

1) Build & up
Command:
```bash
cmd /c .\TMW-docker-build.bat
```
Captured output (truncated where original capture omitted lines):
```text
[BUILD & DOCKER-COMPOSE OUTPUT START]
... (build output omitted in capture)
#10 ... Successfully installed ... ijson-3.3.4 ... portalocker-2.8.0 ...
WARNING: Running pip as the 'root' user ...
[docker-compose up ... started containers]
[BUILD & DOCKER-COMPOSE OUTPUT END]
```

2) Docker logs (last 1000 lines)
```text
[DOCKER LOGS START]
taskmasterwebb  | INFO:    Started server process [11]
taskmasterwebb  | INFO:    Waiting for application startup.
taskmasterwebb  | INFO:    Application startup complete.
taskmasterwebb  | INFO:    Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
[DOCKER LOGS END]
```

3) Health check
Command:
```bash
curl -sS -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n" http://localhost:8199/health
```
Response:
```json
{"ok":true,"message":"taskmasterweb is alive"}
HTTP_CODE:200
TIME_TOTAL:0.026577
```

4) Concurrent writer test
Command:
```bash
python -u scripts/concurrent_post.py
```
Results (JSON):
```json
{
  "posts": [
    {"index":0,"error":"HTTPConnectionPool(host='localhost', port=8199): Read timed out. (read timeout=10)","time_s":10.018146220000004,"title":"smoke-17566274086-0-76ddd2c"},
    {"index":4,"error":"HTTPConnectionPool(host='localhost', port=8199): Read timed out. (read timeout=10)","time_s":10.016327770000014,"title":"smoke-17566274086-4-a631156"},
    {"index":2,"error":"HTTPConnectionPool(host='localhost', port=8199): Read timed out. (read timeout=10)","time_s":10.017244449999983,"title":"smoke-17566274086-2-6400044"},
    {"index":1,"error":"HTTPConnectionPool(host='localhost', port=8199): Read timed out. (read timeout=10)","time_s":10.017810110000013,"title":"smoke-17566274086-1-9e2775d"},
    {"index":3,"error":"HTTPConnectionPool(host='localhost', port=8199): Read timed out. (read timeout=10)","time_s":10.017088330000007,"title":"smoke-17566274086-3-53faa8b"}
  ]
}
```

5) GET /tasks after POST attempts
Captured output (truncated from script):
```text
GET /tasks HTTP_STATUS: 200
GET /tasks BODY: [large JSON array of tasks...]
TASKS_RESPONSE_NOT_LIST
```
Note: script printed TASKS_RESPONSE_NOT_LIST because it expected a list; actual response body is large and contains tasks (snippet omitted).

Analysis and likely causes
1) Symptoms observed:
- Image build shows ijson and portalocker installed successfully during Docker build.
- Uvicorn started and health endpoint returned 200.
- Concurrent POST /task requests all timed out after ~10s.
- GET /tasks returned a large payload (server responsive for GETs).

2) Possible sources (5 considered):
- Database contention or locks causing POST handlers to hang under concurrent writes.
- Task creation path uses file-based storage with locking (portalocker) and long waits when contended.
- Endpoint performs long-running I/O (e.g., heavy parsing) during POST.
- Reverse-proxy or routing misconfiguration causing POST to be routed differently.
- Resource exhaustion inside container (CPU/IO) causing request handlers to stall.

3) Most likely causes (1-2):
- File-based storage locking contention (portalocker) during concurrent writes causing read timeouts.
- MySQL or storage initialization race causing POST to block until some background migration completes.

Evidence to validate:
- Docker logs show no import errors (no ModuleNotFoundError for ijson/portalocker).
- pip installed ijson and portalocker during image build.
- Health OK and Uvicorn running indicates app started successfully.
- Timeouts only on POST under concurrency point to locking or DB write stalls.

Reproduction steps (exact commands run)
- Start build and compose:
  - [`TMW-docker-build.bat`](TMW-docker-build.bat:1): cmd /c .\TMW-docker-build.bat
- Capture logs:
  - docker-compose logs taskmasterweb --tail=1000
- Health check:
  - curl http://localhost:8199/health
- Concurrent writer:
  - python -u [`scripts/concurrent_post.py`](scripts/concurrent_post.py:1)

Remediation / next steps
- Investigate file-based storage locking path in [`app/storage.py`](app/storage.py:1). Add logging around locks and durations.
- Re-run concurrent test while tailing container logs to capture stack traces:
  - docker-compose logs -f taskmasterweb
- If file-lock contention confirmed, consider switching to a DB-backed write path or implement batching/retries with backoff.
- Ensure MySQL container is healthy and migrations completed before accepting writes.

Attached raw captures (included above): build output excerpt, docker logs, health response, concurrent_post output, GET /tasks summary.

Short verdict: failed

Files/commands referenced in this report:
- [`TMW-docker-build.bat`](TMW-docker-build.bat:1)
- [`scripts/concurrent_post.py`](scripts/concurrent_post.py:1)
- [`app/storage.py`](app/storage.py:1)

End of report.