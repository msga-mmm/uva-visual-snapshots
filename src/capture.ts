import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { ensureDir, sanitizeFilename } from "./fs-utils.js";
import type {
  BrowserName,
  CaptureOptions,
  SnapshotManifest,
  SnapshotRecord,
  StoryEntry,
} from "./types.js";

interface StorybookIndexEntry {
  id: string;
  title: string;
  name: string;
  type?: string;
}

interface StorybookIndex {
  entries?: Record<string, StorybookIndexEntry>;
}

interface ResolvedViewport {
  label: string;
  width: number;
  height: number;
  fromMetadata: boolean;
}

interface PageViewportResolution {
  viewportKey: string | null;
  width: number | null;
  height: number | null;
}

interface BrowserLaunchTarget {
  browserType: typeof chromium;
  channel?: "chrome" | "msedge";
}

function getScreenshotStabilityOptions(freezeAnimations: boolean): {
  animations?: "disabled";
  caret?: "hide";
} {
  if (!freezeAnimations) {
    return {};
  }

  return {
    animations: "disabled",
    caret: "hide",
  };
}

function resolveBrowserLaunchTarget(browserName: BrowserName): BrowserLaunchTarget {
  switch (browserName) {
    case "chromium":
      return { browserType: chromium };
    case "google-chrome":
      return { browserType: chromium, channel: "chrome" };
    case "microsoft-edge":
      return { browserType: chromium, channel: "msedge" };
    case "firefox":
      return { browserType: firefox };
    case "webkit":
      return { browserType: webkit };
  }
}

async function waitForStableRender(page: import("playwright").Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        if (!("fonts" in document)) {
          return true;
        }

        return document.fonts.status === "loaded";
      },
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => undefined);

  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}

function buildStorybookUrl(baseUrl: string, relativePath: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(relativePath, normalizedBase).toString();
}

function parseViewportDimension(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.round(value));
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith("px")) {
    const parsed = Number.parseFloat(normalized.slice(0, -2));
    return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : null;
  }

  if (/^[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : null;
  }

  return null;
}

async function resolveStoryViewportFromPage(
  page: import("playwright").Page,
): Promise<PageViewportResolution> {
  return page.evaluate(() => {
    const parseDimension = (value: unknown): number | null => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.max(1, Math.round(value));
      }

      if (typeof value !== "string") {
        return null;
      }

      const normalized = value.trim().toLowerCase();
      if (normalized.endsWith("px")) {
        const parsed = Number.parseFloat(normalized.slice(0, -2));
        return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : null;
      }

      if (/^[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : null;
      }

      return null;
    };

    const preview = (window as Window & { __STORYBOOK_PREVIEW__?: unknown })
      .__STORYBOOK_PREVIEW__ as
      | {
          currentRender?: { story?: unknown };
          storyStoreValue?: { getStoryContext?: (story: unknown) => unknown };
        }
      | undefined;
    const story = preview?.currentRender?.story;
    let context: unknown;

    try {
      if (story && preview?.storyStoreValue?.getStoryContext) {
        context = preview.storyStoreValue.getStoryContext(story);
      }
    } catch {
      context = undefined;
    }

    const typedContext = context as
      | {
          globals?: { viewport?: unknown };
          parameters?: {
            viewport?: {
              defaultViewport?: unknown;
              options?: Record<string, unknown>;
              viewports?: Record<string, unknown>;
            };
          };
        }
      | undefined;
    const storyObject = story as
      | {
          globals?: { viewport?: unknown };
          parameters?: {
            viewport?: {
              defaultViewport?: unknown;
              options?: Record<string, unknown>;
              viewports?: Record<string, unknown>;
            };
          };
        }
      | undefined;
    const globalsViewport = typedContext?.globals?.viewport ?? storyObject?.globals?.viewport;
    const viewportParameters =
      typedContext?.parameters?.viewport ?? storyObject?.parameters?.viewport;
    const options = viewportParameters?.options ?? viewportParameters?.viewports ?? {};

    const viewportKey =
      typeof globalsViewport === "string" && globalsViewport.length > 0
        ? globalsViewport
        : typeof viewportParameters?.defaultViewport === "string"
          ? viewportParameters.defaultViewport
          : null;

    if (!viewportKey || viewportKey === "responsive") {
      return { viewportKey: null, width: null, height: null };
    }

    const preset = options[viewportKey] as
      | {
          styles?: { width?: unknown; height?: unknown };
          viewport?: { styles?: { width?: unknown; height?: unknown } };
        }
      | undefined;
    const styles = preset?.styles ?? preset?.viewport?.styles;

    return {
      viewportKey,
      width: parseDimension(styles?.width),
      height: parseDimension(styles?.height),
    };
  });
}

async function resolveStoryViewport(
  page: import("playwright").Page,
  fallback: { width: number; height: number },
): Promise<ResolvedViewport> {
  const fromPage = await resolveStoryViewportFromPage(page).catch(() => null);
  if (!fromPage || !fromPage.viewportKey) {
    return {
      label: "default",
      width: fallback.width,
      height: fallback.height,
      fromMetadata: false,
    };
  }

  const parsedWidth = parseViewportDimension(fromPage.width);
  const parsedHeight = parseViewportDimension(fromPage.height);

  return {
    label: fromPage.viewportKey,
    width: parsedWidth ?? fallback.width,
    height: parsedHeight ?? fallback.height,
    fromMetadata: true,
  };
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
  freezeAnimations: boolean,
  story: StoryEntry,
  page: import("playwright").Page,
  browser: BrowserName,
  browserDirPrefix?: string,
): Promise<SnapshotRecord> {
  const storyFileName = `${sanitizeFilename(story.id)}.png`;
  let resolvedFileName = browserDirPrefix
    ? path.posix.join(browserDirPrefix, storyFileName)
    : storyFileName;
  let resolvedViewport: ResolvedViewport | null = null;
  const storyUrl = buildStorybookUrl(
    storybookUrl,
    `iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`,
  );

  try {
    await page.goto(storyUrl, { waitUntil: "networkidle", timeout: 30_000 });
    await waitForStableRender(page);
    const defaultViewport = page.viewportSize() ?? { width: 1280, height: 720 };
    resolvedViewport = await resolveStoryViewport(page, {
      width: defaultViewport.width,
      height: defaultViewport.height,
    });
    const currentViewport = page.viewportSize();
    if (
      currentViewport &&
      (currentViewport.width !== resolvedViewport.width ||
        currentViewport.height !== resolvedViewport.height)
    ) {
      await page.setViewportSize({
        width: resolvedViewport.width,
        height: resolvedViewport.height,
      });
      await page.goto(storyUrl, { waitUntil: "networkidle", timeout: 30_000 });
      await waitForStableRender(page);
    }

    const viewportSegment = sanitizeFilename(resolvedViewport.label);
    const relativeFileName = path.posix.join(viewportSegment, storyFileName);
    const fileName = browserDirPrefix
      ? path.posix.join(browserDirPrefix, relativeFileName)
      : relativeFileName;
    resolvedFileName = fileName;
    const outputPath = path.join(outputDir, viewportSegment, storyFileName);
    await ensureDir(path.dirname(outputPath));

    const screenshotStabilityOptions = getScreenshotStabilityOptions(freezeAnimations);

    const root = page.locator(targetSelector).first();
    if (!fullPage && (await root.count()) > 0) {
      await root.screenshot({ path: outputPath, ...screenshotStabilityOptions });
    } else {
      await page.screenshot({ path: outputPath, fullPage, ...screenshotStabilityOptions });
    }

    return {
      ...story,
      browser,
      fileName: resolvedFileName,
      viewportLabel: resolvedViewport.label,
      viewportWidth: resolvedViewport.width,
      viewportHeight: resolvedViewport.height,
      status: "ok",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...story,
      browser,
      fileName: resolvedFileName,
      viewportLabel: resolvedViewport?.label,
      viewportWidth: resolvedViewport?.width,
      viewportHeight: resolvedViewport?.height,
      status: "failed",
      error: message,
    };
  }
}

function asPositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

async function captureStoriesForBrowser(
  options: CaptureOptions,
  stories: StoryEntry[],
  browserName: BrowserName,
  browserOutputDir: string,
  browserDirPrefix: string | undefined,
): Promise<SnapshotRecord[]> {
  const freezeAnimations = options.freezeAnimations ?? true;
  const storyConcurrency = Math.min(stories.length, asPositiveInteger(options.storyConcurrency, 4));
  const launchTarget = resolveBrowserLaunchTarget(browserName);
  const browser = await launchTarget.browserType.launch({
    headless: options.headless,
    channel: launchTarget.channel,
  });
  const records: Array<SnapshotRecord | null> = Array.from({ length: stories.length }, () => null);
  let nextStoryIndex = 0;
  let completed = 0;

  try {
    const workers = Array.from({ length: storyConcurrency }, async () => {
      const context = await browser.newContext({
        viewport: {
          width: options.width,
          height: options.height,
        },
        deviceScaleFactor: 1,
        reducedMotion: freezeAnimations ? "reduce" : "no-preference",
      });
      const page = await context.newPage();

      try {
        while (true) {
          const index = nextStoryIndex;
          nextStoryIndex += 1;
          if (index >= stories.length) {
            break;
          }

          const story = stories[index];
          const record = await captureOneStory(
            browserOutputDir,
            options.storybookUrl,
            options.targetSelector,
            options.fullPage,
            freezeAnimations,
            story,
            page,
            browserName,
            browserDirPrefix,
          );
          records[index] = record;

          completed += 1;
          const marker = record.status === "ok" ? "ok" : "failed";
          console.log(
            `[capture:${browserName}] (${completed}/${stories.length}) ${record.id} -> ${marker}`,
          );
          if (record.error) {
            console.warn(`[capture:${browserName}] ${record.id} error: ${record.error}`);
          }
        }
      } finally {
        await context.close();
      }
    });

    await Promise.all(workers);
    return records.filter((record): record is SnapshotRecord => record !== null);
  } finally {
    await browser.close();
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

  const requestedBrowsers = options.browsers?.length
    ? [...new Set(options.browsers)]
    : [options.browser];
  const useBrowserSubdirectories = requestedBrowsers.length > 1;
  const browserConcurrency = Math.min(
    requestedBrowsers.length,
    asPositiveInteger(options.browserConcurrency, requestedBrowsers.length),
  );

  const recordsByBrowser = new Map<BrowserName, SnapshotRecord[]>();
  let nextBrowserIndex = 0;

  const browserWorkers = Array.from({ length: browserConcurrency }, async () => {
    while (true) {
      const index = nextBrowserIndex;
      nextBrowserIndex += 1;
      if (index >= requestedBrowsers.length) {
        break;
      }

      const browserName = requestedBrowsers[index];
      const browserOutputDir = useBrowserSubdirectories
        ? path.join(options.outputDir, browserName)
        : options.outputDir;
      const browserDirPrefix = useBrowserSubdirectories ? browserName : undefined;
      await ensureDir(browserOutputDir);

      console.log(`[capture:${browserName}] starting (${selectedStories.length} stories)`);
      const browserRecords = await captureStoriesForBrowser(
        options,
        selectedStories,
        browserName,
        browserOutputDir,
        browserDirPrefix,
      );
      recordsByBrowser.set(browserName, browserRecords);
      console.log(`[capture:${browserName}] completed`);
    }
  });

  await Promise.all(browserWorkers);

  const records: SnapshotRecord[] = [];
  for (const browserName of requestedBrowsers) {
    const browserRecords = recordsByBrowser.get(browserName) ?? [];
    records.push(...browserRecords);
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
