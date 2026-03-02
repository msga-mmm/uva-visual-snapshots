import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { ensureDir, sanitizeFilename } from "./fs-utils.js";
import type { CaptureOptions, SnapshotManifest, SnapshotRecord, StoryEntry } from "./types.js";

interface StorybookIndexEntry {
  id: string;
  title: string;
  name: string;
  type?: string;
}

interface StorybookIndex {
  entries?: Record<string, StorybookIndexEntry>;
}

function buildStorybookUrl(baseUrl: string, relativePath: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(relativePath, normalizedBase).toString();
}

async function fetchStories(storybookUrl: string): Promise<StoryEntry[]> {
  const indexUrl = buildStorybookUrl(storybookUrl, "index.json");
  const response = await fetch(indexUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Storybook index.json from ${indexUrl} (HTTP ${response.status}).`,
    );
  }

  const index = (await response.json()) as StorybookIndex;
  const entries = Object.values(index.entries ?? {}).filter(
    (entry) => !entry.type || entry.type === "story",
  );

  return entries
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      name: entry.name,
    }))
    .sort((a, b) => `${a.title}/${a.name}`.localeCompare(`${b.title}/${b.name}`));
}

async function captureOneStory(
  outputDir: string,
  storybookUrl: string,
  targetSelector: string,
  fullPage: boolean,
  story: StoryEntry,
  page: import("playwright").Page,
): Promise<SnapshotRecord> {
  const fileName = `${sanitizeFilename(story.id)}.png`;
  const outputPath = path.join(outputDir, fileName);
  const storyUrl = buildStorybookUrl(
    storybookUrl,
    `iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`,
  );

  try {
    await page.goto(storyUrl, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(250);

    const root = page.locator(targetSelector).first();
    if (!fullPage && (await root.count()) > 0) {
      await root.screenshot({ path: outputPath });
    } else {
      await page.screenshot({ path: outputPath, fullPage });
    }

    return {
      ...story,
      fileName,
      status: "ok",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...story,
      fileName,
      status: "failed",
      error: message,
    };
  }
}

export async function captureSnapshots(options: CaptureOptions): Promise<SnapshotManifest> {
  const storiesFromIndex = await fetchStories(options.storybookUrl);
  const requestedStoryIds = new Set(options.storyIds ?? []);
  const selectedStories =
    requestedStoryIds.size > 0
      ? storiesFromIndex.filter((story) => requestedStoryIds.has(story.id))
      : storiesFromIndex;

  if (selectedStories.length === 0) {
    throw new Error("No stories selected for capture.");
  }

  if (requestedStoryIds.size > 0) {
    const missing = [...requestedStoryIds].filter(
      (id) => !selectedStories.some((story) => story.id === id),
    );
    if (missing.length > 0) {
      console.warn(`[capture] Story IDs not found: ${missing.join(", ")}`);
    }
  }

  await fs.rm(options.outputDir, { recursive: true, force: true });
  await ensureDir(options.outputDir);

  const browserTypeMap = { chromium, firefox, webkit };
  const browser = await browserTypeMap[options.browser].launch({ headless: options.headless });
  const context = await browser.newContext({
    viewport: {
      width: options.width,
      height: options.height,
    },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const records: SnapshotRecord[] = [];
  try {
    for (const [index, story] of selectedStories.entries()) {
      const record = await captureOneStory(
        options.outputDir,
        options.storybookUrl,
        options.targetSelector,
        options.fullPage,
        story,
        page,
      );
      records.push(record);

      const marker = record.status === "ok" ? "ok" : "failed";
      console.log(`[capture] (${index + 1}/${selectedStories.length}) ${record.id} -> ${marker}`);
      if (record.error) {
        console.warn(`[capture] ${record.id} error: ${record.error}`);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const manifest: SnapshotManifest = {
    storybookUrl: options.storybookUrl,
    createdAt: new Date().toISOString(),
    viewport: {
      width: options.width,
      height: options.height,
    },
    stories: records,
  };

  const manifestPath = path.join(options.outputDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}
