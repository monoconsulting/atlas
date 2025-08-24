# taskmaster-ai

Minimal Python stdio MCP-like server for TaskMasterWeb.

To run locally:

python -m pip install -r taskmaster-ai/requirements.txt
python taskmaster-ai/server.py

The server accepts JSON lines on stdin and writes JSON lines to stdout. Example requests:

{"action": "ping", "id": 1}
{"action": "complete", "id": 2, "prompt": "Summarize the repository"}
