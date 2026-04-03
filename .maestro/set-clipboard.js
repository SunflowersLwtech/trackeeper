// Helper: set the iOS simulator clipboard via the Input Bridge server.
// Requires maestro-input-server.js running on port 4567.
//
// Usage in flow YAML:
//   - runScript:
//       file: set-clipboard.js
//       env:
//         CLIPBOARD_TEXT: "hello@example.com"
//   - longPressOn:
//       id: "some-input"
//   - tapOn: "Paste"

var response = http.post("http://localhost:4567/clipboard", {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: CLIPBOARD_TEXT }),
});

// Maestro http response: { ok, status, body, headers }
// Accept if body is "OK" regardless of status property name
if (response.body !== "OK") {
  throw new Error("Clipboard bridge failed: " + response.body);
}
