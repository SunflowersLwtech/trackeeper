#!/usr/bin/env bash
set -euo pipefail

EXPO_LINK="${EXPO_LINK:-exp://192.168.100.154:8081}"
APP_ID="${APP_ID:-host.exp.exponent}"
ADB="${ADB:-adb}"

dump_ui() {
  "$ADB" shell uiautomator dump /sdcard/window.xml >/dev/null
  "$ADB" shell cat /sdcard/window.xml
}

wait_for_text() {
  local pattern="$1"
  local timeout="$2"
  local start
  start="$(date +%s)"

  while true; do
    if dump_ui | rg -q "$pattern"; then
      return 0
    fi

    if [ $(( $(date +%s) - start )) -ge "$timeout" ]; then
      dump_ui > /tmp/trackeeper-android-last-ui.xml
      echo "Timed out waiting for: $pattern" >&2
      echo "Last UI dump: /tmp/trackeeper-android-last-ui.xml" >&2
      return 1
    fi

    sleep 1
  done
}

dismiss_continue_if_present() {
  for _ in 1 2 3 4 5 6 7 8; do
    if dump_ui | rg -q "Continue"; then
      "$ADB" shell input tap 540 2180
      sleep 1
      return 0
    fi
    sleep 0.5
  done
}

run_role() {
  local name="$1"
  local persona_x="$2"
  local email="$3"
  local home_pattern="$4"
  local role_pattern="$5"
  local profile_x="$6"

  "$ADB" shell pm clear "$APP_ID" >/dev/null
  "$ADB" shell am start -a android.intent.action.VIEW -d "$EXPO_LINK" "$APP_ID" >/dev/null

  wait_for_text "WELCOME BACK|Welcome back" 90
  dismiss_continue_if_present

  "$ADB" shell input tap "$persona_x" 2200
  sleep 1
  if ! dump_ui | rg -q "$email"; then
    "$ADB" shell input tap "$persona_x" 2200
    sleep 1
  fi

  wait_for_text "$email" 10
  "$ADB" shell input tap 540 1775

  wait_for_text "$home_pattern" 90
  "$ADB" shell input tap "$profile_x" 2320
  wait_for_text "$role_pattern" 20
  wait_for_text "TUTORIAL|Tutorial" 20

  echo "PASS android $name"
}

run_role tenant 215 "alice@demo.trackeeper.app" "MY REQUESTS|My Requests" "TENANT" 900
run_role manager 540 "manager@demo.trackeeper.app" "DASHBOARD|Dashboard" "MANAGER" 970
run_role maintainer 865 "david@demo.trackeeper.app" "MY TASKS|My Tasks" "MAINTAINER" 900
