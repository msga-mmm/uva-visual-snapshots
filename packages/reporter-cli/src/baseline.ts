import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureDir, fileExists } from "./fs-utils.js";

async function copyDirectory(sourceDir: string, targetDir: string): Promise<void> {
  await ensureDir(targetDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    await ensureDir(path.dirname(targetPath));
    await fs.copyFile(sourcePath, targetPath);
  }
}

export async function updateBaseline(sourceDir: string, baselineDir: string): Promise<void> {
  if (!(await fileExists(sourceDir))) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  await fs.rm(baselineDir, { recursive: true, force: true });
  await copyDirectory(sourceDir, baselineDir);
}
