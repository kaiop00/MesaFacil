import { spawn } from "node:child_process";
import process from "node:process";

const children = [];

function startProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: false,
    ...options,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.stderr.write(`[${name}] encerrado por sinal ${signal}\n`);
    } else {
      process.stderr.write(`[${name}] finalizou com código ${code}\n`);
    }
    shutdown(code ?? 0);
  });

  children.push(child);
  return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("[dev] iniciando app web e print-service...");

startProcess("web", process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev:web"]);
startProcess("print-service", process.platform === "win32" ? "npm.cmd" : "npm", ["--prefix", "apps/print-service", "start"]);