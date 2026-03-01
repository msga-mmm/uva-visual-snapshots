import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";

function parseArg(name, fallback = "") {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return fallback;
}

const projectRoot = process.cwd();
const inputPath = path.resolve(projectRoot, parseArg("--input", "src/report-ui-assets/app.tsx"));
const outputPath = path.resolve(projectRoot, parseArg("--output", "dist/report-ui-assets/app.js"));

async function main() {
  const source = await fs.readFile(inputPath, "utf8");

  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      sourceMap: false,
      removeComments: false,
    },
    fileName: path.basename(inputPath),
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, result.outputText, "utf8");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[build-report-ui-assets] ${message}`);
  process.exit(1);
});
