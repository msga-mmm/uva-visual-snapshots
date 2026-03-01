#!/usr/bin/env bash
set -euo pipefail

MODE="${MODE:-}"
STORYBOOK_DIR="${STORYBOOK_DIR:-}"
TOOL_DIR="${TOOL_DIR:-}"
STORYBOOK_PORT="${STORYBOOK_PORT:-}"
STORYBOOK_URL="${STORYBOOK_URL:-}"
WAIT_ATTEMPTS="${WAIT_ATTEMPTS:-90}"
WAIT_SLEEP_SECONDS="${WAIT_SLEEP_SECONDS:-2}"
REPORT_TIMEOUT_SECONDS="${REPORT_TIMEOUT_SECONDS:-180}"

if [[ -z "$MODE" || -z "$STORYBOOK_DIR" || -z "$TOOL_DIR" ]]; then
  echo "Missing required env vars. Required: MODE, STORYBOOK_DIR, TOOL_DIR"
  exit 2
fi

case "$MODE" in
  baseline)
    LOG_PATH="$RUNNER_TEMP/storybook-baseline.log"
    DEFAULT_PORT="6006"
    ;;
  report)
    LOG_PATH="$RUNNER_TEMP/storybook-report.log"
    DEFAULT_PORT="6007"
    ;;
  *)
    echo "Invalid MODE: $MODE (expected baseline|report)"
    exit 2
    ;;
esac

if [[ -z "$STORYBOOK_PORT" ]]; then
  STORYBOOK_PORT="$DEFAULT_PORT"
fi

if [[ -z "$STORYBOOK_URL" ]]; then
  STORYBOOK_URL="http://127.0.0.1:${STORYBOOK_PORT}"
fi

(
  cd "$STORYBOOK_DIR"
  npm run storybook -- --host 127.0.0.1 --port "$STORYBOOK_PORT" > "$LOG_PATH" 2>&1
) &
STORYBOOK_PID=$!

cleanup_storybook() {
  kill "$STORYBOOK_PID" 2>/dev/null || true
  wait "$STORYBOOK_PID" 2>/dev/null || true
}

trap cleanup_storybook EXIT

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
  REPORT_JSON_PATH="$RUNNER_TEMP/report/report.json"
  REPORT_CMD=(
    npx tsx src/cli.ts report
    --no-serve
    --storybook-url "$STORYBOOK_URL"
    --current "$RUNNER_TEMP/current-report"
    --baseline "$RUNNER_TEMP/baseline"
    --report "$RUNNER_TEMP/report"
  )

  if [[ "${CI:-}" == "true" ]]; then
    set +e
    (
      cd "$TOOL_DIR"
      timeout --signal=TERM --kill-after=10s "${REPORT_TIMEOUT_SECONDS}s" "${REPORT_CMD[@]}"
    )
    REPORT_EXIT_CODE=$?
    set -e

    if [[ "$REPORT_EXIT_CODE" -eq 124 && -f "$REPORT_JSON_PATH" ]]; then
      echo "[report] Report generated before timeout; skipping local server in CI."
    elif [[ "$REPORT_EXIT_CODE" -ne 0 ]]; then
      echo "[report] Report command failed with exit code $REPORT_EXIT_CODE"
      exit "$REPORT_EXIT_CODE"
    fi
  else
    (
      cd "$TOOL_DIR"
      "${REPORT_CMD[@]}"
    )
  fi
fi

cleanup_storybook
trap - EXIT
