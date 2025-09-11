/* Minimal MCP stdio server skeleton
   This example reads JSON lines from stdin and writes JSON lines to stdout.
   It's intentionally small — expand as needed to implement the MCP protocol.
*/

import * as readline from "readline";
import http from "http";

function apiCall(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve) => {
    try {
      const host = process.env.ATLAS_API_HOST || "localhost";
      const port = parseInt(process.env.ATLAS_API_PORT || "8199", 10);
      const data = body ? Buffer.from(JSON.stringify(body)) : undefined;
      const req = http.request(
        { host, port, path, method, headers: { "Content-Type": "application/json" } },
        (res) => {
          let buf = "";
          res.on("data", (ch) => (buf += ch));
          res.on("end", () => {
            try { resolve(JSON.parse(buf)); } catch { resolve({ ok: false, error: "invalid json" }); }
          });
        }
      );
      req.on("error", () => resolve({ ok: false, error: "connection error" }));
      if (data) req.write(data);
      req.end();
    } catch {
      resolve({ ok: false, error: "request failed" });
    }
  });
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

console.error("MCP server starting...");

rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    const action = msg.action;
    if (action === "get_prompt") {
      // params: { taskId, subId?, slug? }
      const { taskId, subId, slug } = msg;
      const base = slug ? `/${slug}` : "";
      const path = `${base}/task/${taskId}`;
      apiCall("GET", path).then((data) => {
        let prompt: string | null = null;
        if (data && data.data) {
          if (subId) {
            const st = (data.data.subtasks || []).find((s: any) => String(s.id) === String(subId));
            prompt = st?.prompt ?? null;
          } else {
            prompt = data.data.prompt ?? null;
          }
        }
        const resp = { id: msg.id ?? null, result: { prompt }, error: null };
        process.stdout.write(JSON.stringify(resp) + "\n");
      });
    } else if (action === "set_prompt") {
      // params: { taskId, subId?, prompt, slug? }
      const { taskId, subId, prompt, slug } = msg;
      const base = slug ? `/${slug}` : "";
      const path = subId ? `${base}/task/${taskId}/subtask/${subId}` : `${base}/task/${taskId}`;
      apiCall("PATCH", path, { prompt }).then((data) => {
        const ok = data && data.ok;
        const resp = { id: msg.id ?? null, result: { ok }, error: null };
        process.stdout.write(JSON.stringify(resp) + "\n");
      });
    } else {
      // Echo as default
      const resp = { id: msg.id ?? null, result: { echo: msg }, error: null };
      process.stdout.write(JSON.stringify(resp) + "\n");
    }
  } catch (err) {
    const resp = { id: null, result: null, error: String(err) };
    process.stdout.write(JSON.stringify(resp) + "\n");
  }
});
