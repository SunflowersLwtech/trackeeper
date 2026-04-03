/**
 * Maestro Input Bridge Server
 *
 * Workaround for Maestro inputText / pasteText not delivering text
 * to React Native TextInput on iOS 26.2 simulator.
 *
 * This server receives HTTP requests from Maestro's runScript and
 * uses `xcrun simctl pbcopy` to place text on the simulator's
 * clipboard. The Maestro flow then triggers the iOS paste action
 * (long-press + tap "Paste") to insert the text.
 *
 * Usage:
 *   node scripts/maestro-input-server.js &
 *   # Then run Maestro flows that call http://localhost:4567/clipboard
 *   # Kill server when done
 */

const http = require("http");
const { execSync } = require("child_process");

const PORT = 4567;

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/clipboard") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const { text } = JSON.parse(body);
        if (!text) {
          res.writeHead(400);
          res.end("Missing text field");
          return;
        }

        // Set the simulator's pasteboard via xcrun simctl pbcopy.
        // Use printf instead of echo -n to avoid -n being treated as literal text.
        const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/%/g, "%%");
        execSync(`printf "%s" "${escaped}" | xcrun simctl pbcopy booted`, {
          timeout: 5000,
        });

        res.writeHead(200);
        res.end("OK");
      } catch (err) {
        console.error("Error:", err.message);
        res.writeHead(500);
        res.end(err.message);
      }
    });
  } else if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    res.end("OK");
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Maestro Input Bridge listening on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log('  POST /clipboard  - body: { text: "..." } - sets simulator clipboard');
  console.log("  GET  /health     - health check");
});
