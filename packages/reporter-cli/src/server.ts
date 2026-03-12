import express from "express";
import path from "node:path";
import type { ReportServerOptions } from "./types.js";

export async function serveReport(options: ReportServerOptions): Promise<void> {
  const app = express();
  const staticPath = path.resolve(options.reportDir);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(express.static(staticPath));

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(options.port, () => {
      console.log(`[report] Serving ${staticPath}`);
      console.log(`[report] Open http://localhost:${options.port}`);
      resolve();
    });

    server.on("error", reject);
  });
}
