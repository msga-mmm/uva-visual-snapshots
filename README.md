# UVA Visual Snapshots

A small npm package to:

1. Capture Storybook snapshots
2. Create and update a baseline set
3. Generate a visual comparison report with a React UI

The report UI is read-only: it does not mutate snapshots from the browser.

## Commands

- `uva-visual-snapshots baseline`: capture snapshots and promote them to baseline
- `uva-visual-snapshots report`: capture current snapshots, compare with baseline, generate report, and serve it

## Install

```bash
npm install
npx playwright install chromium firefox webkit chrome msedge
npm run build
```

## Quick start

1. Generate baseline from Storybook:

```bash
npm run baseline -- --storybook-url http://localhost:6006
```

2. Generate and serve report:

```bash
npm run report -- --storybook-url http://localhost:6006
# open http://localhost:4400
```

## CLI options

### baseline

```bash
uva-visual-snapshots baseline \
  --storybook-url http://localhost:6006 \
  --current .uva-visual-snapshots/current \
  --baseline .uva-visual-snapshots/baseline \
  --browser chromium \
  --browser google-chrome \
  --browser microsoft-edge \
  --browser firefox \
  --browser webkit \
  --width 1280 \
  --height 720 \
  --story-concurrency 4 \
  --browser-concurrency 3 \
  --target-selector "#storybook-root, #root" \
  --story button--primary card--default \
  --full-page
```

### report

```bash
uva-visual-snapshots report \
  --storybook-url http://localhost:6006 \
  --current .uva-visual-snapshots/current \
  --baseline .uva-visual-snapshots/baseline \
  --report .uva-visual-snapshots/report \
  --browser chromium \
  --browser google-chrome \
  --browser microsoft-edge \
  --browser firefox \
  --browser webkit \
  --width 1280 \
  --height 720 \
  --story-concurrency 4 \
  --browser-concurrency 3 \
  --target-selector "#storybook-root, #root" \
  --diff-ratio-threshold 0 \
  --pixel-threshold 0.1 \
  --port 4400
```

`--browser` supports `chromium` (default), `google-chrome`, `microsoft-edge`, `firefox`, and `webkit` (Safari engine). `google-chrome` launches Playwright Chromium with channel `chrome`, and `microsoft-edge` launches channel `msedge`, so they use the real branded browsers when installed. Repeat `--browser` to capture multiple browsers in one run. When multiple browsers are provided, snapshots are written under browser subdirectories (for example `current/chromium/...`).

Viewport is resolved per story from Storybook viewport metadata when available (for example `parameters.viewport.defaultViewport` / globals). Snapshots are grouped under viewport subdirectories (for example `current/chromium/mobile/...`) so cross-browser comparisons match the same story+viewport.

Captures freeze motion by default (`reducedMotion: reduce` plus Playwright screenshot animation disabling) to keep animated stories deterministic in CI. Use `--no-freeze-animations` only when you explicitly need live animation frames.

Use `--no-serve` when running in CI to generate report files without starting the report web server.

## Generated output

- `.uva-visual-snapshots/current/*.png`: current run snapshots
- `.uva-visual-snapshots/current/manifest.json`: story metadata from last capture
- `.uva-visual-snapshots/baseline/*.png`: baseline snapshots
- `.uva-visual-snapshots/report/index.html`: self-contained React visual diff UI (inline JS/CSS)
- `.uva-visual-snapshots/report/report.json`: summary + all entries

## Notes

- The report lists all entries and supports filtering by status.
- If dimensions differ between baseline and current, entry status is `dimension_mismatch`.
- Baseline updates are done via CLI (`baseline`), not via UI actions.

## GitHub Actions (branch-to-branch diff)

Workflow file: `.github/workflows/branch-visual-diff.yml`

- Baseline snapshots are captured from one branch (`baseline_branch`, default: `main`)
- Report/diff snapshots are captured from another branch (`report_branch`, default: current runner branch)
- Chromium, Google Chrome, Microsoft Edge, Firefox, and WebKit are captured in a single workflow job and merged into one report
- The generated report is uploaded as a workflow artifact: `visual-diff-report`
- The report UI includes browser chips/tabs to switch between browser-specific results
- Capture orchestration is centralized in `scripts/ci-capture.sh` to keep workflow YAML minimal.
