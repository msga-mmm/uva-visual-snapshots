import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir } from "./fs-utils.js";
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

async function readAppJsOrTranspile(assetsDir: string): Promise<string> {
  const appJsPath = path.join(assetsDir, "app.js");
  if (await pathExists(appJsPath)) {
    return fs.readFile(appJsPath, "utf8");
  }

  const appTsxPath = path.join(assetsDir, "app.tsx");
  if (!(await pathExists(appTsxPath))) {
    throw new Error(`Report UI app source not found at ${appTsxPath}`);
  }

  let typescriptModule: unknown;
  try {
    typescriptModule = await import("typescript");
  } catch {
    throw new Error(
      "app.js is missing and TypeScript transpiler is unavailable. Run `npm run build` to generate report UI assets.",
    );
  }

  const ts = (typescriptModule as { default?: unknown }).default ?? typescriptModule;
  const typedTs = ts as {
    ScriptTarget: { ES2022: unknown };
    ModuleKind: { ESNext: unknown };
    JsxEmit: { React: unknown };
    transpileModule: (
      source: string,
      options: { compilerOptions: Record<string, unknown>; fileName: string },
    ) => {
      outputText: string;
    };
  };

  const source = await fs.readFile(appTsxPath, "utf8");
  const result = typedTs.transpileModule(source, {
    compilerOptions: {
      target: typedTs.ScriptTarget.ES2022,
      module: typedTs.ModuleKind.ESNext,
      jsx: typedTs.JsxEmit.React,
      sourceMap: false,
      removeComments: false,
    },
    fileName: "app.tsx",
  });

  return result.outputText;
}

export async function writeReportHtml(
  reportDir: string,
  reportData: CompareReportData,
): Promise<void> {
  await ensureDir(reportDir);

  const assetsDir = await resolveAssetsDir();
  const templatePath = path.join(assetsDir, "index.html");
  const template = await fs.readFile(templatePath, "utf8");
  const appJs = await readAppJsOrTranspile(assetsDir);
  await fs.writeFile(path.join(reportDir, "app.js"), appJs, "utf8");
  await fs.copyFile(path.join(assetsDir, "styles.css"), path.join(reportDir, "styles.css"));

  const htmlPath = path.join(reportDir, "index.html");
  await fs.writeFile(htmlPath, renderIndexHtml(template, reportData), "utf8");
}

export { statusLabel };
