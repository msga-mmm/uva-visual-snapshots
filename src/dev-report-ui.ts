import express from "express";
import { promises as fs } from "node:fs";
import { watch } from "node:fs";
import path from "node:path";
import ts from "typescript";

interface Args {
  port: number;
  reportDir: string;
}

function parseArgs(argv: string[]): Args {
  let port = 4173;
  let reportDir = ".uva-visual-snapshots/report";

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--port" && argv[i + 1]) {
      port = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (value === "--report-dir" && argv[i + 1]) {
      reportDir = argv[i + 1];
      i += 1;
    }
  }

  return { port, reportDir };
}

async function readReportJson(reportDir: string): Promise<Record<string, unknown>> {
  const reportPath = path.join(reportDir, "report.json");
  try {
    const raw = await fs.readFile(reportPath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      baselineDir: "",
      currentDir: "",
      diffRatioThreshold: 0,
      pixelThreshold: 0.1,
      summary: {
        total: 0,
        changed: 0,
        unchanged: 0,
        missingBaseline: 0,
        missingCurrent: 0,
        dimensionMismatch: 0,
        errors: 0,
      },
      entries: [],
    };
  }
}

async function transpileAppTsx(assetsDir: string): Promise<string> {
  const inputPath = path.join(assetsDir, "app.tsx");
  const source = await fs.readFile(inputPath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      sourceMap: false,
      removeComments: false,
    },
    fileName: "app.tsx",
  });
  return result.outputText;
}

function bumpVersion(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const app = express();
  const assetsDir = path.resolve("src/report-ui-assets");
  const reportDir = path.resolve(args.reportDir);
  let version = bumpVersion();
  await fs.mkdir(reportDir, { recursive: true });

  app.get("/app.js", async (_req, res) => {
    try {
      const output = await transpileAppTsx(assetsDir);
      res.type("application/javascript");
      res.set("Cache-Control", "no-store");
      res.send(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res
        .status(500)
        .type("application/javascript")
        .send(`throw new Error(${JSON.stringify(message)});`);
    }
  });

  app.use(express.static(assetsDir));

  app.get("/report-data.json", async (_req, res) => {
    const report = await readReportJson(reportDir);
    res.json(report);
  });

  app.get("/__dev/version", (_req, res) => {
    res.json({ version });
  });

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(args.port, () => {
      console.log(`[report-ui-dev] Serving source UI from ${assetsDir}`);
      console.log(`[report-ui-dev] Reading report data from ${reportDir}/report.json`);
      console.log(`[report-ui-dev] Open http://localhost:${args.port}`);
      resolve();
    });
    server.on("error", reject);
  });

  watch(assetsDir, () => {
    version = bumpVersion();
  });

  watch(reportDir, () => {
    version = bumpVersion();
  });
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[report-ui-dev] ${message}`);
  process.exit(1);
});
