import path from "node:path";
import react from "@vitejs/plugin-react";
import { build, type InlineConfig } from "vite";

interface BundleFileLike {
  fileName: string;
  type?: string;
  code?: string;
  source?: string | Uint8Array;
}

interface BundleOutputLike {
  output?: BundleFileLike[];
}

export interface ReportUiBundle {
  appJs: string;
  stylesCss: string;
}

export function createReportUiBuildConfig(
  projectRoot: string,
  options: { outDir?: string; write?: boolean; nodeEnv?: "development" | "production" } = {},
): InlineConfig {
  const nodeEnv = options.nodeEnv ?? "production";
  return {
    configFile: false,
    envFile: false,
    root: projectRoot,
    publicDir: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify(nodeEnv),
    },
    plugins: [react()],
    build: {
      outDir: options.outDir ?? path.resolve(projectRoot, "dist/report-ui-assets"),
      emptyOutDir: false,
      write: options.write ?? true,
      cssCodeSplit: false,
      target: "es2022",
      lib: {
        entry: path.resolve(projectRoot, "src/report-ui-assets/main.tsx"),
        name: "UvaVisualSnapshotsReportUi",
        formats: ["iife"],
        fileName: () => "app.js",
        cssFileName: "styles",
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          banner: `var process = globalThis.process || { env: { NODE_ENV: ${JSON.stringify(nodeEnv)} } };`,
        },
      },
    },
  };
}

function flattenBundleOutputs(result: unknown): BundleFileLike[] {
  const outputs: BundleFileLike[] = [];
  const queue = Array.isArray(result) ? result : [result];

  for (const item of queue) {
    const output = (item as BundleOutputLike | null)?.output;
    if (Array.isArray(output)) {
      outputs.push(...output);
    }
  }

  return outputs;
}

export async function bundleReportUiAssets(projectRoot: string): Promise<ReportUiBundle> {
  const result = await build(createReportUiBuildConfig(projectRoot, { write: false }));
  const outputs = flattenBundleOutputs(result);

  const jsFile = outputs.find((file) => file.fileName === "app.js" && typeof file.code === "string");
  const cssFile = outputs.find(
    (file) => file.fileName === "styles.css" && (typeof file.source === "string" || file.source instanceof Uint8Array),
  );

  if (!jsFile?.code) {
    throw new Error("Vite build did not emit app.js for the report UI.");
  }

  if (!cssFile?.source) {
    throw new Error("Vite build did not emit styles.css for the report UI.");
  }

  return {
    appJs: jsFile.code,
    stylesCss:
      typeof cssFile.source === "string"
        ? cssFile.source
        : new TextDecoder("utf8").decode(cssFile.source),
  };
}
