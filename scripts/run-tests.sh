#!/bin/bash
# TracKeeper — Automated Test Pipeline
# Usage: ./scripts/run-tests.sh [--e2e]

set -e

echo "========================================="
echo " TracKeeper Test Pipeline"
echo "========================================="
echo ""

# 1. TypeScript Check
echo "► [1/4] TypeScript type check..."
npx tsc --noEmit
echo "  ✅ Zero TypeScript errors"
echo ""

# 2. ESLint
echo "► [2/4] ESLint..."
ESLINT_USE_FLAT_CONFIG=false npx eslint . --ext .ts,.tsx --quiet && echo "  ✅ Zero ESLint errors" || { echo "  ❌ ESLint errors found"; exit 1; }
echo ""

# 3. Unit Tests + Coverage
echo "► [3/4] Jest unit tests..."
npx jest --coverage --no-cache
echo ""

# 4. E2E Tests (optional, requires running app + simulator)
if [ "$1" = "--e2e" ]; then
  echo "► [4/4] Maestro E2E tests..."
  if command -v maestro &> /dev/null || [ -x "$HOME/.maestro/bin/maestro" ]; then
    MAESTRO_BIN="${HOME}/.maestro/bin/maestro"
    command -v maestro &> /dev/null && MAESTRO_BIN="maestro"

    # Start the Maestro Input Bridge server (workaround for iOS 26.2
    # where Maestro inputText does not deliver text to RN TextInput).
    echo "  Starting Maestro Input Bridge server..."
    node scripts/maestro-input-server.js &
    BRIDGE_PID=$!
    sleep 1

    # Run E2E flows (skip 00_input_test which is a debug helper)
    $MAESTRO_BIN test .maestro/ --exclude-tags=debug || E2E_EXIT=$?

    # Stop the bridge server
    kill $BRIDGE_PID 2>/dev/null || true
    wait $BRIDGE_PID 2>/dev/null || true

    if [ "${E2E_EXIT:-0}" -ne 0 ]; then
      echo "  ❌ E2E tests failed"
      exit 1
    fi
  else
    echo "  ⚠️  Maestro not found. Install: curl -Ls https://get.maestro.mobile.dev | bash"
  fi
else
  echo "► [4/4] E2E tests skipped (pass --e2e to run)"
fi

echo ""
echo "========================================="
echo " Pipeline Complete"
echo "========================================="
