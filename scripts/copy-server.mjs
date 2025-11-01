import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve("scripts", "serve-dist.mjs");
const destination = resolve("dist", "server.mjs");

async function ensureDirExists(path) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }
  }
}

async function main() {
  await ensureDirExists(dirname(destination));
  await copyFile(source, destination);
  console.log(`[copy-server] Copied ${source} -> ${destination}`);
}

main().catch((error) => {
  console.error("[copy-server] Failed to copy server script:", error);
  process.exit(1);
});
