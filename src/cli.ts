#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { updateBaseline } from "./baseline.js";
import { captureSnapshots } from "./capture.js";
import { compareSnapshots } from "./compare.js";
import { serveReport } from "./server.js";

function toNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function toBrowser(value: string): "chromium" | "firefox" | "webkit" {
  const normalized = value.toLowerCase();
  if (normalized !== "chromium" && normalized !== "firefox" && normalized !== "webkit") {
    throw new Error(`Invalid browser: ${value}. Expected chromium, firefox, or webkit.`);
  }
  return normalized;
}

interface BaselineCliOptions {
  storybookUrl: string;
  current: string;
  baseline: string;
  browser: "chromium" | "firefox" | "webkit";
  width: string;
  height: string;
  targetSelector: string;
  story?: string[];
  fullPage?: boolean;
  freezeAnimations: boolean;
  headed?: boolean;
}

interface ReportCliOptions {
  storybookUrl: string;
  current: string;
  baseline: string;
  report: string;
  browser: "chromium" | "firefox" | "webkit";
  width: string;
  height: string;
  targetSelector: string;
  story?: string[];
  fullPage?: boolean;
  freezeAnimations: boolean;
  headed?: boolean;
  diffRatioThreshold: string;
  pixelThreshold: string;
  port: string;
  serve: boolean;
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("uva-visual-snapshots")
    .description(
      "Capture Storybook snapshots, manage baseline, and generate a read-only React report UI.",
    )
    .version("0.1.0");

  program
    .command("baseline")
    .description("Capture snapshots from Storybook and promote them as baseline.")
    .option("--storybook-url <url>", "Storybook URL", "http://localhost:6006")
    .option("--current <dir>", "Current snapshots directory", ".uva-visual-snapshots/current")
    .option("--baseline <dir>", "Baseline snapshots directory", ".uva-visual-snapshots/baseline")
    .option(
      "--browser <name>",
      "Browser engine: chromium, firefox, or webkit (Safari engine)",
      "chromium",
    )
    .option("--width <px>", "Viewport width", "1280")
    .option("--height <px>", "Viewport height", "720")
    .option("--target-selector <selector>", "Root selector to screenshot", "#storybook-root, #root")
    .option("--story <id...>", "Specific Storybook story IDs to capture")
    .option("--full-page", "Capture full page screenshot", false)
    .option(
      "--no-freeze-animations",
      "Allow CSS animations/transitions during capture (default freezes motion for stable diffs)",
    )
    .option("--headed", "Run browser in headed mode", false)
    .action(async (options: BaselineCliOptions) => {
      const currentDir = path.resolve(options.current);
      const baselineDir = path.resolve(options.baseline);

      const manifest = await captureSnapshots({
        storybookUrl: options.storybookUrl,
        outputDir: currentDir,
        browser: toBrowser(options.browser),
        width: toNumber(options.width, "width"),
        height: toNumber(options.height, "height"),
        headless: !options.headed,
        fullPage: Boolean(options.fullPage),
        freezeAnimations: options.freezeAnimations,
        targetSelector: options.targetSelector,
        storyIds: options.story,
      });

      await updateBaseline(currentDir, baselineDir);

      const okCount = manifest.stories.filter((story) => story.status === "ok").length;
      const failCount = manifest.stories.length - okCount;

      console.log(`[baseline] Capture completed: ${okCount} succeeded, ${failCount} failed.`);
      console.log(`[baseline] Current snapshots: ${currentDir}`);
      console.log(`[baseline] Baseline updated: ${baselineDir}`);
    });

  program
    .command("report")
    .description("Capture current snapshots, compare with baseline, generate report, and serve it.")
    .option("--storybook-url <url>", "Storybook URL", "http://localhost:6006")
    .option("--current <dir>", "Current snapshots directory", ".uva-visual-snapshots/current")
    .option("--baseline <dir>", "Baseline snapshots directory", ".uva-visual-snapshots/baseline")
    .option("--report <dir>", "Output report directory", ".uva-visual-snapshots/report")
    .option(
      "--browser <name>",
      "Browser engine: chromium, firefox, or webkit (Safari engine)",
      "chromium",
    )
    .option("--width <px>", "Viewport width", "1280")
    .option("--height <px>", "Viewport height", "720")
    .option("--target-selector <selector>", "Root selector to screenshot", "#storybook-root, #root")
    .option("--story <id...>", "Specific Storybook story IDs to capture")
    .option("--full-page", "Capture full page screenshot", false)
    .option(
      "--no-freeze-animations",
      "Allow CSS animations/transitions during capture (default freezes motion for stable diffs)",
    )
    .option("--headed", "Run browser in headed mode", false)
    .option("--diff-ratio-threshold <number>", "Minimum mismatch ratio to flag as changed", "0")
    .option("--pixel-threshold <number>", "Pixelmatch sensitivity threshold", "0.1")
    .option("--port <port>", "Port to serve on", "4400")
    .option("--no-serve", "Generate report without starting the local server")
    .action(async (options: ReportCliOptions) => {
      const currentDir = path.resolve(options.current);
      const baselineDir = path.resolve(options.baseline);
      const reportDir = path.resolve(options.report);

      const manifest = await captureSnapshots({
        storybookUrl: options.storybookUrl,
        outputDir: currentDir,
        browser: toBrowser(options.browser),
        width: toNumber(options.width, "width"),
        height: toNumber(options.height, "height"),
        headless: !options.headed,
        fullPage: Boolean(options.fullPage),
        freezeAnimations: options.freezeAnimations,
        targetSelector: options.targetSelector,
        storyIds: options.story,
      });

      const okCount = manifest.stories.filter((story) => story.status === "ok").length;
      const failCount = manifest.stories.length - okCount;

      const report = await compareSnapshots({
        baselineDir,
        currentDir,
        reportDir,
        diffRatioThreshold: toNumber(options.diffRatioThreshold, "diff-ratio-threshold"),
        pixelThreshold: toNumber(options.pixelThreshold, "pixel-threshold"),
      });

      console.log(`[report] Capture completed: ${okCount} succeeded, ${failCount} failed.`);
      console.log(`[report] Total: ${report.summary.total}`);
      console.log(`[report] Changed: ${report.summary.changed}`);
      console.log(`[report] Unchanged: ${report.summary.unchanged}`);
      console.log(`[report] Generated: ${reportDir}/index.html`);

      if (options.serve) {
        await serveReport({
          reportDir,
          port: toNumber(options.port, "port"),
        });
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[uva-visual-snapshots] ${message}`);
  process.exit(1);
});
