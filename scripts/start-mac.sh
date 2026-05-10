#!/usr/bin/env bash
# TracKeeper local launcher for macOS/Linux.
# - Frees the 8080-8099 dev-port range.
# - Starts Expo on LAN host/port 8080 for Web + Expo Go device testing.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT_START="${PORT_START:-8080}"
PORT_END="${PORT_END:-8099}"
EXPO_PORT="${EXPO_PORT:-8080}"
EXPO_HOST="${EXPO_HOST:-lan}"

cd "$PROJECT_DIR"

echo "TracKeeper launcher"
echo "Project: $PROJECT_DIR"
echo "Clearing TCP ports ${PORT_START}-${PORT_END}..."

for port in $(seq "$PORT_START" "$PORT_END"); do
  pids="$(lsof -ti "tcp:${port}" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "  port ${port}: killing ${pids//$'\n'/ }"
    kill $pids 2>/dev/null || true
  fi
done

LAN_IP="$(
  ipconfig getifaddr en0 2>/dev/null ||
  ipconfig getifaddr en1 2>/dev/null ||
  hostname -I 2>/dev/null | awk '{print $1}' ||
  true
)"

echo ""
echo "Starting Expo..."
echo "Web:      http://${LAN_IP:-localhost}:${EXPO_PORT}"
echo "Expo Go:  exp://${LAN_IP:-localhost}:${EXPO_PORT}"
echo ""

npx expo start --web --port "$EXPO_PORT" --host "$EXPO_HOST"
