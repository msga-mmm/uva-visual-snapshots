# Standalone Frontend Architecture Plan

## Goal

Redesign the package so the snapshot pipeline and the report UI are separate products with a clean contract:

- The CLI owns capture, baseline promotion, comparison, and artifact generation.
- The React app owns presentation and interaction only.
- The UI reads report data from a relative JSON endpoint or file instead of being embedded into the Node package runtime.
- The frontend can evolve as a normal standalone Vite app without inheriting Node runtime constraints.

## Why Change

The current architecture mixes two runtimes under one TypeScript configuration:

- Node runtime code in `src/cli.ts`, `src/capture.ts`, `src/compare.ts`, `src/server.ts`
- Vite/React browser code in `src/report-ui-assets/**`

This causes structural friction:

- The frontend is typechecked under `NodeNext`, so browser code inherits Node ESM import rules.
- `src/report-ui.ts` bundles and injects UI assets into the generated report, which tightly couples report generation to UI build details.
- The report format and the UI implementation are not cleanly separated.
- The frontend cannot be treated as a first-class standalone app with its own tooling, conventions, and delivery model.

## Target Architecture

### 1. Reporter CLI Package

Node-focused code that does not know about React, Vite, or browser UI implementation details.

Responsibilities:

- Capture Storybook snapshots with Playwright
- Promote current snapshots to baseline
- Compare baseline vs current snapshots
- Generate diff images and a report manifest
- Optionally serve static output for local viewing

Suggested package:

- `packages/reporter-cli`

### 2. Report Data Contract

A stable JSON schema that becomes the only integration boundary between the CLI and the frontend.

Responsibilities:

- Define report metadata
- Define summary counters
- Define per-entry data
- Define asset paths as relative URLs
- Remain backward-compatible when possible

Suggested artifact layout:

```text
report/
  index.html
  report.json
  assets/
    baseline/...
    current/...
    diff/...
```

The frontend should assume:

- `report.json` lives next to `index.html`
- image paths inside `report.json` are relative to the report root

### 3. Standalone Report Frontend

A Vite React app that can run independently from the CLI package.

Responsibilities:

- Fetch `./report.json` by default
- Render summary, story list, image viewers, filters, and comparison modes
- Optionally accept a custom report URL through query params or config
- Stay strictly presentational and read-only

Suggested package:

- `packages/report-ui`

Suggested direction:

- give it its own `tsconfig`, Vite config, package scripts, and linting scope
- treat its built output as static files copied into the final report directory

## Design Principles

### Contract First

The report JSON schema is the product boundary. The CLI should generate it without knowing how React consumes it.

### Static Output First

The final report should remain viewable as static files. Local serving is useful, but should not be required for the architecture to make sense.

### Frontend Independence

The frontend should be buildable and testable on its own, using bundler-friendly TypeScript rules instead of Node runtime rules.

### Minimal Coupling

The backend should not inline frontend bundles or inject app code into HTML templates beyond copying static build output and placing report data next to it.

## Proposed End State

### CLI Flow

1. `baseline` captures snapshots and updates the baseline directory.
2. `report` captures current snapshots.
3. `report` compares baseline and current snapshots.
4. `report` writes:
   - `report.json`
   - image assets under `assets/`
   - static frontend build output copied into the report directory
5. optional `serve` command serves the generated static report directory

### Frontend Flow

1. Browser loads `index.html`
2. Frontend fetches `./report.json`
3. Frontend resolves image URLs from relative paths in the JSON
4. Frontend renders the report with no Node-specific assumptions

## Recommended Refactor Sequence

### Phase 1: Formalize the Data Contract

Deliverables:

- create a dedicated report schema module for the generated report
- separate frontend view types from CLI generation types where needed
- make `compare.ts` write `report.json` as the primary source of truth

Notes:

- `CompareReportData` in `src/types.ts` is the starting point, but it should be treated as a versioned contract rather than an incidental internal type.
- add a schema version field to the report payload

Suggested payload additions:

- `schemaVersion`
- `generatedAt`
- capture configuration summary
- browser list
- viewport metadata

### Phase 2: Stop Embedding the UI into Report Generation

Current coupling:

- `src/compare.ts` calls `writeReportHtml`
- `src/report-ui.ts` bundles or reads UI assets and writes `app.js` and `styles.css`

Target:

- comparison code only writes report data and image assets
- a separate step copies prebuilt frontend assets into `reportDir`

Implementation options:

- simplest: build frontend first, then copy build output into `reportDir`
- alternative: package prebuilt frontend assets with the npm package and copy them during `report`

Recommendation:

- start with prebuilt frontend assets copied by the CLI
- avoid runtime bundling during `report`

That removes Vite build logic from the hot path of report generation.

### Phase 3: Split the Frontend into a Standalone App

Move `src/report-ui-assets/**` into a standalone frontend workspace package.

Suggested structure:

```text
packages/
  reporter-cli/
    src/
    package.json
    tsconfig.json
  report-ui/
    src/
    index.html
    package.json
    tsconfig.json
```

Frontend expectations:

- fetch `./report.json`
- no inline bootstrap data required
- no dependency on Node module resolution
- own build command emits static assets

### Phase 4: Simplify the Node Package

After the frontend is externalized:

- delete `src/report-ui.ts`
- delete `src/report-ui-vite.ts`
- replace dynamic UI bundling with a static copy step
- narrow the Node package to capture/compare/serve concerns

At that point, the Node package can stay ESM, move to CommonJS, or be bundled independently without affecting the frontend.

### Phase 5: Improve the Frontend as a Product

Once the frontend is decoupled, it becomes easier to add:

- routing or deep-linking by story
- persisted UI state in URL params
- richer metadata panels
- more comparison modes
- accessibility and keyboard navigation improvements
- standalone deployment for browsing archived reports

## File and Module Changes

### Keep in `packages/reporter-cli`

- CLI entrypoint
- capture and baseline modules
- compare/report generation modules
- local static report server
- filesystem helpers
- Node-side shared types

### Move to `packages/report-ui` or Replace

- `src/report-ui-assets/**`
- `src/report-ui.ts`
- `src/report-ui-vite.ts`
- `src/dev-report-ui.ts`

### Introduce

- `src/report-schema.ts` or equivalent contract module
- workspace root config for `packages/*`
- build artifact copy step for frontend output

## Build and Packaging Direction

## `packages/reporter-cli`

Recommended direction:

- keep the CLI/package focused on Node execution
- compile or bundle it independently of the frontend

Possible future choices:

- keep raw Node ESM if preferred
- switch the Node side to a bundled build
- switch the Node side to CommonJS if that simplifies package consumption

This decision should be made for the CLI package only, not forced onto the frontend.

## `packages/report-ui`

Recommended direction:

- standard Vite React project
- bundler-oriented TypeScript settings
- extensionless imports are acceptable there because the bundler is the runtime boundary

## Local Development Workflow

Target developer workflow:

1. run Storybook
2. run `packages/reporter-cli` report generation to produce `report.json` and image assets
3. run `packages/report-ui` in dev mode against the generated report directory

Useful dev modes:

- `frontend dev` reading `../.uva-visual-snapshots/report/report.json`
- `frontend preview` against a built frontend
- `cli report --no-serve` for artifact generation only

The current `src/dev-report-ui.ts` can be replaced with a small dev utility inside `packages/report-ui` or dropped if Vite can read the report directory directly.

## Migration Strategy

### Step 1

Stabilize and document the report JSON schema before moving files.

### Step 2

Change the frontend bootstrap to fetch `./report.json` instead of relying on inline embedded data.

### Step 3

Build the frontend into a normal static bundle and copy that bundle into `reportDir`.

### Step 4

Remove `writeReportHtml` bundle orchestration from the compare path.

### Step 5

Move the CLI and frontend into separate workspace packages under `packages/*`.

### Step 6

Decide separately how each workspace package should be built and published.

## Risks

### Contract Drift

If CLI types and frontend types evolve independently without a formal schema boundary, regressions will be subtle. This is the main risk.

Mitigation:

- one canonical schema module
- fixture-based frontend tests using saved `report.json` samples
- CLI tests that validate generated report shape

### Asset Path Breakage

Relative image paths must remain valid after the frontend build is copied into `reportDir`.

Mitigation:

- standardize all asset paths relative to report root
- add integration tests that open a generated report and verify image URLs load

### Packaging Complexity

Shipping prebuilt frontend assets inside the npm package needs a clear build pipeline.

Mitigation:

- make frontend build output deterministic
- include built assets explicitly in package files

## Open Decisions

1. Should the standalone frontend live inside this repo as a workspace app, or in a separate repo?
2. Should the CLI copy prebuilt frontend assets from the published package, or trigger a build in local development only?
3. Do we want `report.json` to be the only runtime data file, or should there also be smaller derived JSON files for faster loading on large reports?
4. Do we want the frontend to support opening arbitrary report directories via query param or drag-and-drop in the future?

## Recommended Immediate Next Steps

1. Introduce a versioned report schema module and document the JSON contract.
2. Refactor the frontend bootstrap to load `./report.json`.
3. Replace inline embedding with static frontend asset copying.
4. Move the React app into its own frontend root with its own TypeScript config.
5. Re-evaluate the Node package build after the frontend is fully decoupled.

## Success Criteria

The redesign is complete when all of the following are true:

- the CLI can generate a report without bundling frontend source code at runtime
- the frontend can run as a normal standalone Vite app
- the frontend consumes only `report.json` and relative assets
- Node package build choices no longer affect frontend source ergonomics
- the report remains distributable as static files
