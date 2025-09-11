import os
import json
import urllib.request


def api_get(path: str):
    host = os.getenv('ATLAS_API_HOST', 'localhost')
    port = os.getenv('HOST_PORT', '8199')
    url = f"http://{host}:{port}{path}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8', errors='ignore'))


def api_post(path: str, body: dict | None = None):
    host = os.getenv('ATLAS_API_HOST', 'localhost')
    port = os.getenv('HOST_PORT', '8199')
    url = f"http://{host}:{port}{path}"
    data = json.dumps(body or {}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode('utf-8', errors='ignore'))


def main():
    print("[import_all] Listing projects...")
    projs = api_get('/api/projects')
    if not projs.get('ok'):
        print("[import_all] Failed to list projects:", projs)
        return 2
    projects = projs.get('projects') or []
    print(f"[import_all] Found {len(projects)} projects")
    errors = []
    for p in projects:
        slug = p.get('slug')
        if not slug:
            continue
        print(f"[import_all] Importing tasks for {slug} ...")
        try:
            res = api_post(f"/api/import/{slug}/tasks")
            print(f"  -> {res}")
        except Exception as e:
            print(f"  !! import failed for {slug}: {e}")
            errors.append({"slug": slug, "error": str(e)})
    print("[import_all] Done.")
    if errors:
        print("[import_all] Summary: some imports failed:")
        for err in errors:
            print(f"  - {err['slug']}: {err['error']}")
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
