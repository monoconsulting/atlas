/* Minimal MCP stdio server skeleton
   This example reads JSON lines from stdin and writes JSON lines to stdout.
   It's intentionally small — expand as needed to implement the MCP protocol.
*/

import * as readline from "readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

console.error("MCP server starting...");

rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    // Echo back a simple acknowledgement
    const resp = { id: msg.id ?? null, result: { echo: msg }, error: null };
    process.stdout.write(JSON.stringify(resp) + "\n");
  } catch (err) {
    const resp = { id: null, result: null, error: String(err) };
    process.stdout.write(JSON.stringify(resp) + "\n");
  }
});
