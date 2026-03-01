import { promises as fs } from "node:fs";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { ensureDir, fileExists, readJsonIfExists, toPosixPath, walkFiles } from "./fs-utils.js";
import { writeReportHtml } from "./report-ui.js";
import type {
  CompareEntry,
  CompareOptions,
  CompareReportData,
  CompareSummary,
  SnapshotManifest,
} from "./types.js";

interface StoryMeta {
  id?: string;
  title?: string;
  name?: string;
}

function createEmptySummary(total: number): CompareSummary {
  return {
    total,
    changed: 0,
    unchanged: 0,
    missingBaseline: 0,
    missingCurrent: 0,
    dimensionMismatch: 0,
    errors: 0,
  };
}

function buildStoryMetaMap(manifest: SnapshotManifest | null): Map<string, StoryMeta> {
  const map = new Map<string, StoryMeta>();
  if (!manifest) {
    return map;
  }

  for (const story of manifest.stories) {
    map.set(toPosixPath(story.fileName), {
      id: story.id,
      title: story.title,
      name: story.name,
    });
  }

  return map;
}

async function collectPngFilesByRelativePath(dir: string): Promise<Map<string, string>> {
  const files = await walkFiles(dir, ".png");
  const map = new Map<string, string>();

  for (const filePath of files) {
    const relative = toPosixPath(path.relative(dir, filePath));
    map.set(relative, filePath);
  }

  return map;
}

async function copyAsset(
  reportDir: string,
  bucket: string,
  key: string,
  sourcePath: string,
): Promise<string> {
  const relative = toPosixPath(path.join("assets", bucket, key));
  const outputPath = path.join(reportDir, relative);
  await ensureDir(path.dirname(outputPath));
  await fs.copyFile(sourcePath, outputPath);
  return relative;
}

async function writeDiffAsset(reportDir: string, key: string, png: PNG): Promise<string> {
  const relative = toPosixPath(path.join("assets", "diff", key));
  const outputPath = path.join(reportDir, relative);
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, PNG.sync.write(png));
  return relative;
}

function pushChangedEntry(
  entry: CompareEntry,
  entries: CompareEntry[],
  summary: CompareSummary,
): void {
  entries.push(entry);
  summary.changed += 1;

  switch (entry.status) {
    case "missing_baseline":
      summary.missingBaseline += 1;
      break;
    case "missing_current":
      summary.missingCurrent += 1;
      break;
    case "dimension_mismatch":
      summary.dimensionMismatch += 1;
      break;
    case "error":
      summary.errors += 1;
      break;
    default:
      break;
  }
}

export async function compareSnapshots(options: CompareOptions): Promise<CompareReportData> {
  if (!(await fileExists(options.baselineDir))) {
    throw new Error(`Baseline directory not found: ${options.baselineDir}`);
  }

  if (!(await fileExists(options.currentDir))) {
    throw new Error(`Current directory not found: ${options.currentDir}`);
  }

  await fs.rm(options.reportDir, { recursive: true, force: true });
  await ensureDir(options.reportDir);

  const baselineFiles = await collectPngFilesByRelativePath(options.baselineDir);
  const currentFiles = await collectPngFilesByRelativePath(options.currentDir);

  const allKeys = new Set<string>([...baselineFiles.keys(), ...currentFiles.keys()]);
  const orderedKeys = [...allKeys].sort((a, b) => a.localeCompare(b));

  const baselineManifest = await readJsonIfExists<SnapshotManifest>(
    path.join(options.baselineDir, "manifest.json"),
  );
  const currentManifest = await readJsonIfExists<SnapshotManifest>(
    path.join(options.currentDir, "manifest.json"),
  );
  const baselineMeta = buildStoryMetaMap(baselineManifest);
  const currentMeta = buildStoryMetaMap(currentManifest);

  const summary = createEmptySummary(orderedKeys.length);
  const entries: CompareEntry[] = [];

  for (const key of orderedKeys) {
    const baselinePath = baselineFiles.get(key);
    const currentPath = currentFiles.get(key);
    const meta = currentMeta.get(key) ?? baselineMeta.get(key);

    if (!baselinePath && currentPath) {
      const currentImage = await copyAsset(options.reportDir, "current", key, currentPath);
      pushChangedEntry(
        {
          key,
          storyId: meta?.id,
          title: meta?.title,
          name: meta?.name,
          status: "missing_baseline",
          currentImage,
          notes: "Present in current run but missing in baseline.",
        },
        entries,
        summary,
      );
      continue;
    }

    if (baselinePath && !currentPath) {
      const baselineImage = await copyAsset(options.reportDir, "baseline", key, baselinePath);
      pushChangedEntry(
        {
          key,
          storyId: meta?.id,
          title: meta?.title,
          name: meta?.name,
          status: "missing_current",
          baselineImage,
          notes: "Present in baseline but missing in current run.",
        },
        entries,
        summary,
      );
      continue;
    }

    if (!baselinePath || !currentPath) {
      continue;
    }

    try {
      const baselinePng = PNG.sync.read(await fs.readFile(baselinePath));
      const currentPng = PNG.sync.read(await fs.readFile(currentPath));

      const baselineImage = await copyAsset(options.reportDir, "baseline", key, baselinePath);
      const currentImage = await copyAsset(options.reportDir, "current", key, currentPath);

      if (baselinePng.width !== currentPng.width || baselinePng.height !== currentPng.height) {
        pushChangedEntry(
          {
            key,
            storyId: meta?.id,
            title: meta?.title,
            name: meta?.name,
            status: "dimension_mismatch",
            baselineImage,
            currentImage,
            width: currentPng.width,
            height: currentPng.height,
            notes: `Baseline ${baselinePng.width}x${baselinePng.height} vs current ${currentPng.width}x${currentPng.height}`,
          },
          entries,
          summary,
        );
        continue;
      }

      const diffPng = new PNG({ width: baselinePng.width, height: baselinePng.height });
      const mismatchPixels = pixelmatch(
        baselinePng.data,
        currentPng.data,
        diffPng.data,
        baselinePng.width,
        baselinePng.height,
        {
          threshold: options.pixelThreshold,
        },
      );
      const mismatchRatio = mismatchPixels / (baselinePng.width * baselinePng.height);

      if (mismatchRatio > options.diffRatioThreshold) {
        const diffImage = await writeDiffAsset(options.reportDir, key, diffPng);
        pushChangedEntry(
          {
            key,
            storyId: meta?.id,
            title: meta?.title,
            name: meta?.name,
            status: "changed",
            baselineImage,
            currentImage,
            diffImage,
            mismatchPixels,
            mismatchRatio,
            width: baselinePng.width,
            height: baselinePng.height,
          },
          entries,
          summary,
        );
      } else {
        entries.push({
          key,
          storyId: meta?.id,
          title: meta?.title,
          name: meta?.name,
          status: "unchanged",
          baselineImage,
          currentImage,
          width: baselinePng.width,
          height: baselinePng.height,
          mismatchPixels,
          mismatchRatio,
        });
        summary.unchanged += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const baselineImage = await copyAsset(options.reportDir, "baseline", key, baselinePath);
      const currentImage = await copyAsset(options.reportDir, "current", key, currentPath);

      pushChangedEntry(
        {
          key,
          storyId: meta?.id,
          title: meta?.title,
          name: meta?.name,
          status: "error",
          baselineImage,
          currentImage,
          notes: `Comparison error: ${message}`,
        },
        entries,
        summary,
      );
    }
  }

  const reportData: CompareReportData = {
    generatedAt: new Date().toISOString(),
    baselineDir: path.resolve(options.baselineDir),
    currentDir: path.resolve(options.currentDir),
    diffRatioThreshold: options.diffRatioThreshold,
    pixelThreshold: options.pixelThreshold,
    summary,
    entries,
  };

  await fs.writeFile(
    path.join(options.reportDir, "report.json"),
    JSON.stringify(reportData, null, 2),
    "utf8",
  );
  await writeReportHtml(options.reportDir, reportData);

  return reportData;
}
