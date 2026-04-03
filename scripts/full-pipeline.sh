#!/bin/bash
# TracKeeper — Full Automated Pipeline
# Runs: static checks → unit tests → boot simulator → start Expo → run E2E
#
# Usage:
#   ./scripts/full-pipeline.sh              # Full pipeline (unit + E2E)
#   ./scripts/full-pipeline.sh --unit-only   # Skip E2E
#   ./scripts/full-pipeline.sh --e2e-only    # Skip unit tests, just E2E

set -euo pipefail

MAESTRO="$HOME/.maestro/bin/maestro"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SIMULATOR_NAME="iPhone 17 Pro"
EXPO_PORT=8081
MODE="${1:-full}"

cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step() { echo -e "\n${BLUE}► $1${NC}"; }
pass() { echo -e "  ${GREEN}✅ $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "  ${RED}❌ $1${NC}"; }

echo -e "${BLUE}========================================="
echo " TracKeeper Full Automated Pipeline"
echo "=========================================${NC}"

# ─── PHASE 1: Static Checks ───
if [ "$MODE" != "--e2e-only" ]; then
  step "[1/5] TypeScript type check"
  if npx tsc --noEmit 2>&1; then
    pass "Zero TypeScript errors"
  else
    fail "TypeScript errors found"
    exit 1
  fi

  step "[2/5] ESLint"
  if ESLINT_USE_FLAT_CONFIG=false npx eslint . --ext .ts,.tsx --quiet; then
    pass "Zero ESLint errors"
  else
    fail "ESLint errors found"
    exit 1
  fi

  step "[3/5] Jest unit tests"
  npx jest --no-cache --coverage
  pass "All unit tests passed"
fi

if [ "$MODE" = "--unit-only" ]; then
  echo -e "\n${GREEN}Pipeline (unit-only) complete!${NC}"
  exit 0
fi

# ─── PHASE 2: E2E Setup ───
step "[4/5] Boot iOS Simulator"

# Check if simulator already running
if xcrun simctl list devices booted 2>&1 | grep -q "iPhone"; then
  pass "Simulator already running"
else
  echo "  Booting $SIMULATOR_NAME..."
  xcrun simctl boot "$SIMULATOR_NAME" 2>/dev/null || true
  # Wait for simulator to be ready
  sleep 3
  open -a Simulator
  sleep 2
  pass "Simulator booted: $SIMULATOR_NAME"
fi

# Start Expo in background if not already running
if curl -s "http://localhost:$EXPO_PORT" > /dev/null 2>&1; then
  pass "Expo already running on port $EXPO_PORT"
else
  echo "  Starting Expo dev server..."
  npx expo start --ios --no-dev --port "$EXPO_PORT" &
  EXPO_PID=$!
  echo "  Waiting for Metro bundler (PID: $EXPO_PID)..."
  # Wait up to 60 seconds for Metro to be ready
  for i in $(seq 1 60); do
    if curl -s "http://localhost:$EXPO_PORT" > /dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  pass "Expo dev server started"
fi

# Give the app time to load on simulator
sleep 5

# ─── PHASE 3: E2E Tests ───
step "[5/5] Maestro E2E tests"

if [ ! -f "$MAESTRO" ]; then
  warn "Maestro not found at $MAESTRO"
  echo "  Install: curl -Ls https://get.maestro.mobile.dev | bash"
  exit 1
fi

# Run each flow individually for better error reporting
E2E_PASS=0
E2E_FAIL=0
for flow in .maestro/*.yaml; do
  flow_name=$(basename "$flow" .yaml)
  echo -e "  Running: ${YELLOW}$flow_name${NC}"
  if "$MAESTRO" test "$flow" 2>&1 | tail -3; then
    E2E_PASS=$((E2E_PASS + 1))
  else
    E2E_FAIL=$((E2E_FAIL + 1))
    warn "Flow failed: $flow_name"
  fi
done

echo ""
echo -e "${BLUE}========================================="
echo " Pipeline Results"
echo "=========================================${NC}"
[ "$MODE" != "--e2e-only" ] && echo -e "  Unit tests:  ${GREEN}PASSED${NC}"
echo -e "  E2E passed:  ${GREEN}$E2E_PASS${NC}"
if [ "$E2E_FAIL" -gt 0 ]; then
  echo -e "  E2E failed:  ${RED}$E2E_FAIL${NC}"
  echo -e "\n${YELLOW}Pipeline completed with E2E failures.${NC}"
  exit 1
fi
echo -e "\n${GREEN}All checks passed!${NC}"
