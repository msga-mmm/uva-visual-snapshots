#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-}"
STORYBOOK_DIR="${STORYBOOK_DIR:-}"
TOOL_DIR="${TOOL_DIR:-}"
STORYBOOK_URL="${STORYBOOK_URL:-http://127.0.0.1:6006}"
WAIT_ATTEMPTS="${WAIT_ATTEMPTS:-90}"
WAIT_SLEEP_SECONDS="${WAIT_SLEEP_SECONDS:-2}"

if [[ -z "$MODE" || -z "$STORYBOOK_DIR" || -z "$TOOL_DIR" ]]; then
  echo "Missing required env vars. Required: MODE, STORYBOOK_DIR, TOOL_DIR"
  exit 2
fi

case "$MODE" in
  baseline)
    LOG_PATH="$RUNNER_TEMP/storybook-baseline.log"
    ;;
  report)
    LOG_PATH="$RUNNER_TEMP/storybook-report.log"
    ;;
  *)
    echo "Invalid MODE: $MODE (expected baseline|report)"
    exit 2
    ;;
esac

(
  cd "$STORYBOOK_DIR"
  npm run storybook > "$LOG_PATH" 2>&1
) &
STORYBOOK_PID=$!
trap 'kill "$STORYBOOK_PID" || true' EXIT

for _ in $(seq 1 "$WAIT_ATTEMPTS"); do
  if curl -fsS "$STORYBOOK_URL" >/dev/null; then
    break
  fi
  sleep "$WAIT_SLEEP_SECONDS"
done

if ! curl -fsS "$STORYBOOK_URL" >/dev/null; then
  if [[ "$MODE" == "baseline" ]]; then
    echo "Baseline Storybook failed to start."
  else
    echo "Report Storybook failed to start."
  fi
  cat "$LOG_PATH"
  exit 1
fi

if [[ "$MODE" == "baseline" ]]; then
  (
    cd "$TOOL_DIR"
    npx tsx src/cli.ts baseline \
      --storybook-url "$STORYBOOK_URL" \
      --current "$RUNNER_TEMP/current-baseline" \
      --baseline "$RUNNER_TEMP/baseline"
  )
else
  (
    cd "$TOOL_DIR"
    npx tsx src/cli.ts report \
      --no-serve \
      --storybook-url "$STORYBOOK_URL" \
      --current "$RUNNER_TEMP/current-report" \
      --baseline "$RUNNER_TEMP/baseline" \
      --report "$RUNNER_TEMP/report"
  )
fi

kill "$STORYBOOK_PID" || true
trap - EXIT
