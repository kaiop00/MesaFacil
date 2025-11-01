import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname);
const DEFAULT_FILE = "index.html";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

console.log("[serve-dist] Booting static server...");
console.log(`[serve-dist] Root directory: ${ROOT_DIR}`);

const envPort = process.env.PORT;
const argPort = process.argv[2];
const portRaw = typeof envPort === "string" && envPort ? envPort : argPort;
let port = Number.parseInt(portRaw || "8080", 10);

if (!Number.isFinite(port)) {
  console.error(`[serve-dist] Invalid port "${portRaw}". Falling back to 8080.`);
  port = 8080;
}

function resolvePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = decodedPath.replace(/(\.\.[/\\])/g, "");
  const targetPath = path.join(ROOT_DIR, safePath);
  if (targetPath.endsWith("/")) {
    return path.join(targetPath, DEFAULT_FILE);
  }
  return targetPath;
}

async function fileExists(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function sendFile(res, filePath, status = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(status, { "Content-Type": contentType });
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  const target = resolvePath(req.url);

  if (await fileExists(target)) {
    sendFile(res, target);
    return;
  }

  const fallback = path.join(ROOT_DIR, DEFAULT_FILE);
  if (await fileExists(fallback)) {
    sendFile(res, fallback);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const startServer = () => {
  try {
    server.listen(port, "0.0.0.0", () => {
      console.log(`[serve-dist] Listening on port ${port}`);
    });
  } catch (error) {
    console.error("[serve-dist] Failed to start server:", error);
    process.exit(1);
  }
};

server.on("error", (error) => {
  console.error("[serve-dist] Server emitted error:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("[serve-dist] Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[serve-dist] Unhandled rejection:", reason);
  process.exit(1);
});

startServer();
