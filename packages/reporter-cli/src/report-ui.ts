import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir } from "./fs-utils.js";
import type { DiffStatus } from "./types.js";

function statusLabel(status: DiffStatus): string {
  switch (status) {
    case "changed":
      return "changed";
    case "unchanged":
      return "unchanged";
    case "missing_baseline":
      return "missing baseline";
    case "missing_current":
      return "missing current";
    case "dimension_mismatch":
      return "dimension mismatch";
    case "error":
      return "error";
    default:
      return status;
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveAssetsDir(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(moduleDir, "report-ui-assets"),
    path.resolve(moduleDir, "..", "..", "report-ui", "dist"),
  ];

  for (const candidate of candidates) {
    if (
      (await pathExists(path.join(candidate, "index.html"))) &&
      (await pathExists(path.join(candidate, "assets")))
    ) {
      return candidate;
    }
  }

  throw new Error("Report UI assets not found. Build packages/report-ui before generating reports.");
}

export async function copyReportUiAssets(reportDir: string): Promise<void> {
  await ensureDir(reportDir);

  const assetsDir = await resolveAssetsDir();
  await fs.cp(assetsDir, reportDir, { recursive: true });
}

export { statusLabel };
