import express from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createServer as createViteServer } from "vite";

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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const app = express();
  const assetsDir = path.resolve("src/report-ui-assets");
  const projectRoot = path.resolve(".");
  const reportDir = path.resolve(args.reportDir);
  await fs.mkdir(reportDir, { recursive: true });

  const vite = await createViteServer({
    configFile: false,
    envFile: false,
    root: projectRoot,
    publicDir: false,
    server: {
      middlewareMode: true,
    },
  });

  app.get("/report-data.json", async (_req, res) => {
    const report = await readReportJson(reportDir);
    res.json(report);
  });

  app.use(vite.middlewares);

  app.get("/", async (req, res, next) => {
    try {
      const report = await readReportJson(reportDir);
      const embedded = JSON.stringify(report).replace(/</g, "\\u003c");
      const html = await vite.transformIndexHtml(
        req.originalUrl,
        [
          "<!doctype html>",
          "<html lang=\"en\">",
          "  <head>",
          "    <meta charset=\"utf-8\" />",
          "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
          "    <title>UVA Visual Snapshots Report</title>",
          "  </head>",
          "  <body>",
          "    <div id=\"app\"></div>",
          "    <script id=\"report-data\" type=\"application/json\">",
          `      ${embedded}`,
          "    </script>",
          "    <script>",
          "      window.process = window.process || { env: { NODE_ENV: \"development\" } };",
          "    </script>",
          "    <script type=\"module\" src=\"/src/report-ui-assets/main.tsx\"></script>",
          "  </body>",
          "</html>",
        ].join("\n"),
      );
      res.status(200).type("text/html").send(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
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
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[report-ui-dev] ${message}`);
  process.exit(1);
});
