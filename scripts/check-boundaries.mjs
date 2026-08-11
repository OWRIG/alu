import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "src");
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".mjs"]);
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(absolutePath);
      return sourceExtensions.has(path.extname(entry.name)) ? [absolutePath] : [];
    }),
  );
  return nested.flat();
}

function layerOf(filePath) {
  const relative = path.relative(sourceRoot, filePath).split(path.sep);
  return relative[0];
}

function isPackage(specifier, packageName) {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function forbiddenReason(layer, specifier) {
  const normalized = specifier.replaceAll("\\", "/");
  if (layer === "renderer") {
    if (specifier.startsWith("node:") || isPackage(specifier, "electron")) {
      return "renderer 不能直接访问 Node 或 Electron";
    }
    if (/\/(?:main|preload)\//.test(normalized)) {
      return "renderer 不能绕过 preload 边界";
    }
  }
  if (layer === "domain") {
    if (
      specifier.startsWith("node:") ||
      ["electron", "react", "react-dom", "three", "zustand"].some((name) =>
        isPackage(specifier, name),
      )
    ) {
      return "domain 必须保持无框架、无平台依赖";
    }
    if (/\/(?:main|preload|renderer|shared)\//.test(normalized)) {
      return "domain 不能反向依赖外层";
    }
  }
  if (layer === "shared" && /\/(?:main|preload|renderer)\//.test(normalized)) {
    return "shared 不能依赖进程实现层";
  }
  if (layer === "main" && /\/renderer\//.test(normalized)) {
    return "main 不能导入 renderer";
  }
  if (
    layer === "node" &&
    (isPackage(specifier, "electron") || /\/(?:main|preload|renderer)\//.test(normalized))
  ) {
    return "共享 Node 文件层不能依赖 Electron 或应用进程实现";
  }
  if (layer === "vendor" && /\/domain\//.test(normalized)) {
    return "vendor 适配层不能泄漏进 domain";
  }
  return null;
}

const violations = [];
for (const filePath of await sourceFiles(sourceRoot)) {
  const source = await readFile(filePath, "utf8");
  const layer = layerOf(filePath);
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    const reason = forbiddenReason(layer, specifier);
    if (reason) {
      violations.push(`${path.relative(projectRoot, filePath)} → ${specifier}: ${reason}`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(
    `Import boundary violations:\n${violations.map((item) => `- ${item}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write("Import boundaries: OK\n");
}
