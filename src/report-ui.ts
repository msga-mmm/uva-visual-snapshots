import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir } from "./fs-utils.js";
import { bundleReportUiAssets } from "./report-ui-vite.js";
import type { CompareReportData, DiffStatus } from "./types.js";

const REPORT_DATA_PLACEHOLDER = "__REPORT_DATA__";

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
    path.resolve(moduleDir, "..", "src", "report-ui-assets"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  throw new Error("Report UI assets not found. Expected report-ui-assets next to runtime module.");
}

function renderIndexHtml(template: string, reportData: CompareReportData): string {
  const embedded = JSON.stringify(reportData).replace(/</g, "\\u003c");

  if (!template.includes(REPORT_DATA_PLACEHOLDER)) {
    throw new Error(`Report template is missing placeholder: ${REPORT_DATA_PLACEHOLDER}`);
  }

  return template.replace(REPORT_DATA_PLACEHOLDER, embedded);
}

async function readUiAssetsOrBundle(assetsDir: string): Promise<{ appJs: string; stylesCss: string }> {
  const appJsPath = path.join(assetsDir, "app.js");
  const stylesCssPath = path.join(assetsDir, "styles.css");
  if ((await pathExists(appJsPath)) && (await pathExists(stylesCssPath))) {
    const [appJs, stylesCss] = await Promise.all([
      fs.readFile(appJsPath, "utf8"),
      fs.readFile(stylesCssPath, "utf8"),
    ]);
    return { appJs, stylesCss };
  }

  const mainTsxPath = path.join(assetsDir, "main.tsx");
  if (!(await pathExists(mainTsxPath))) {
    throw new Error(`Report UI entry source not found at ${mainTsxPath}`);
  }

  const projectRoot = path.resolve(assetsDir, "..", "..");
  return bundleReportUiAssets(projectRoot);
}

export async function writeReportHtml(
  reportDir: string,
  reportData: CompareReportData,
): Promise<void> {
  await ensureDir(reportDir);

  const assetsDir = await resolveAssetsDir();
  const templatePath = path.join(assetsDir, "index.html");
  const template = await fs.readFile(templatePath, "utf8");
  const { appJs, stylesCss } = await readUiAssetsOrBundle(assetsDir);

  await Promise.all([
    fs.writeFile(path.join(reportDir, "app.js"), appJs, "utf8"),
    fs.writeFile(path.join(reportDir, "styles.css"), stylesCss, "utf8"),
  ]);

  const htmlPath = path.join(reportDir, "index.html");
  await fs.writeFile(htmlPath, renderIndexHtml(template, reportData), "utf8");
}

export { statusLabel };
