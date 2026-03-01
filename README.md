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
npx playwright install chromium
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
  --width 1280 \
  --height 720 \
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
  --width 1280 \
  --height 720 \
  --target-selector "#storybook-root, #root" \
  --diff-ratio-threshold 0 \
  --pixel-threshold 0.1 \
  --port 4400
```

Use `--no-serve` when running in CI to generate report files without starting the report web server.

## Generated output

- `.uva-visual-snapshots/current/*.png`: current run snapshots
- `.uva-visual-snapshots/current/manifest.json`: story metadata from last capture
- `.uva-visual-snapshots/baseline/*.png`: baseline snapshots
- `.uva-visual-snapshots/report/index.html`: React visual diff UI
- `.uva-visual-snapshots/report/report.json`: summary + all entries

## Notes

- The report lists all entries and supports filtering by status.
- If dimensions differ between baseline and current, entry status is `dimension_mismatch`.
- Baseline updates are done via CLI (`baseline`), not via UI actions.

## GitHub Actions (branch-to-branch diff)

Workflow file: `.github/workflows/branch-visual-diff.yml`

- Baseline snapshots are captured from one branch (`baseline_branch`, default: `main`)
- Report/diff snapshots are captured from another branch (`report_branch`, default: current runner branch)
- The generated report is uploaded as a workflow artifact: `visual-diff-report`
- Capture orchestration is centralized in `scripts/ci-capture.sh` to keep workflow YAML minimal.
