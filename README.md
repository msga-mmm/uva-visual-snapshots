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
cd test-storybook && npm install
npx playwright install chromium firefox webkit
npm run build
```

## Quick start

1. Start the local fixture Storybook in a separate terminal:

```bash
cd test-storybook
npm run storybook
```

Storybook starts at `http://localhost:6006`.

2. Generate baseline from Storybook:

```bash
npm run baseline -- --storybook-url http://localhost:6006
```

3. Generate and serve report:

```bash
npm run report -- --storybook-url http://localhost:6006
# open http://localhost:4400
```

## Local development

Use the fixture app in `test-storybook/` when developing or testing snapshot capture locally.
For React UI hot reload, run the report UI through Vite instead of serving the generated static report.

1. Install dependencies:

```bash
npm install
cd test-storybook && npm install
```

2. Start Storybook:

```bash
cd test-storybook
npm run storybook
```

3. In the repo root, create or refresh the snapshot/report data:

```bash
npm run baseline -- --storybook-url http://localhost:6006
npm run report -- --storybook-url http://localhost:6006 --no-serve
```

To run only for Chromium, add `--browser chromium`:

```bash
npm run baseline -- --storybook-url http://localhost:6006 --browser chromium
npm run report -- --storybook-url http://localhost:6006 --browser chromium --no-serve
```

Chromium is also the default when `--browser` is omitted.

4. Start the React report UI dev server with hot reload:

```bash
npm run dev:report-ui
```

Open `http://localhost:4173`.

`npm run report` without `--no-serve` serves the generated static report on port `4400`, which does not support hot reload.

## CLI options

### baseline

```bash
uva-visual-snapshots baseline \
  --storybook-url http://localhost:6006 \
  --current .uva-visual-snapshots/current \
  --baseline .uva-visual-snapshots/baseline \
  --browser chromium \
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

`--browser` supports `chromium` (default), `firefox`, and `webkit` (Safari engine). Repeat `--browser` to capture multiple browsers in one run. When multiple browsers are provided, snapshots are written under browser subdirectories (for example `current/chromium/...`).

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
- Chromium, Firefox, and WebKit are captured in a single workflow job and merged into one report
- The generated report is uploaded as a workflow artifact: `visual-diff-report`
- The report UI includes browser chips/tabs to switch between browser-specific results
- Capture orchestration is centralized in `scripts/ci-capture.sh` to keep workflow YAML minimal.
