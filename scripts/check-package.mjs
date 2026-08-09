import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractFile, listPackage } from "@electron/asar";
import { FuseState, FuseV1Options, getCurrentFuseWire } from "@electron/fuses";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = path.join(root, "release", "mac-arm64", "ALU.app");
const resources = path.join(app, "Contents", "Resources");
const asar = path.join(resources, "app.asar");
const executable = path.join(app, "Contents", "MacOS", "ALU");

await Promise.all([access(asar), access(executable)]);

const unpacked = path.join(resources, "app.asar.unpacked");
try {
  await access(unpacked);
  throw new Error("Unexpected app.asar.unpacked directory");
} catch (error) {
  if (error instanceof Error && !error.message.includes("ENOENT")) throw error;
}

const applicationLocales = (await readdir(resources))
  .filter((name) => name.endsWith(".lproj"))
  .sort();
const expectedApplicationLocales = ["en.lproj", "zh_CN.lproj"];
if (JSON.stringify(applicationLocales) !== JSON.stringify(expectedApplicationLocales)) {
  throw new Error(`Unexpected application locales: ${applicationLocales.join(", ")}`);
}

const frameworkResources = path.join(
  app,
  "Contents",
  "Frameworks",
  "Electron Framework.framework",
  "Versions",
  "A",
  "Resources",
);
const frameworkLocales = (await readdir(frameworkResources))
  .filter((name) => name.endsWith(".lproj"))
  .sort();
if (
  !frameworkLocales.includes("en.lproj") ||
  !frameworkLocales.includes("zh_CN.lproj") ||
  frameworkLocales.some((name) => name !== "en.lproj" && !name.startsWith("zh_CN"))
) {
  throw new Error(`Unexpected Electron framework locales: ${frameworkLocales.join(", ")}`);
}

const asarSize = (await stat(asar)).size;
const maximumAsarSize = 20 * 1024 * 1024;
if (asarSize > maximumAsarSize) {
  throw new Error(`app.asar is ${(asarSize / 1024 / 1024).toFixed(1)} MiB; expected <= 20 MiB`);
}

const asarEntries = listPackage(asar, { isPack: false }).map((entry) =>
  entry.replaceAll("\\", "/"),
);
const requiredEntries = [
  "/dist/main/index.js",
  "/dist/preload/index.cjs",
  "/dist/renderer/index.html",
  "/package.json",
];
for (const entry of requiredEntries) {
  if (!asarEntries.includes(entry)) throw new Error(`Missing ASAR entry: ${entry}`);
}
const forbiddenRoots = ["/docs/", "/e2e/", "/scripts/", "/skills/", "/src/", "/test/"];
const forbiddenEntry = asarEntries.find((entry) =>
  forbiddenRoots.some((rootName) => entry.startsWith(rootName)),
);
if (forbiddenEntry) throw new Error(`Unexpected source material in ASAR: ${forbiddenEntry}`);
const distSourceMap = asarEntries.find(
  (entry) => entry.startsWith("/dist/") && entry.endsWith(".map"),
);
if (distSourceMap) throw new Error(`Unexpected production source map: ${distSourceMap}`);

const rendererHtml = extractFile(asar, "dist/renderer/index.html").toString("utf8");
if (
  !rendererHtml.includes("connect-src 'self';") ||
  /ws:\/\/(?:localhost|127\.0\.0\.1)/.test(rendererHtml)
) {
  throw new Error("Production renderer CSP exposes development WebSocket sources");
}

const fuses = await getCurrentFuseWire(app);
const expectedFuses = new Map([
  [FuseV1Options.RunAsNode, FuseState.DISABLE],
  [FuseV1Options.EnableCookieEncryption, FuseState.ENABLE],
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable, FuseState.DISABLE],
  [FuseV1Options.EnableNodeCliInspectArguments, FuseState.DISABLE],
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FuseState.ENABLE],
  [FuseV1Options.OnlyLoadAppFromAsar, FuseState.ENABLE],
  [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot, FuseState.DISABLE],
  [FuseV1Options.GrantFileProtocolExtraPrivileges, FuseState.DISABLE],
  [FuseV1Options.WasmTrapHandlers, FuseState.ENABLE],
]);
for (const [name, expectedState] of expectedFuses) {
  if (fuses[name] !== expectedState) {
    throw new Error(`Unexpected fuse ${FuseV1Options[name]}: ${FuseState[fuses[name]]}`);
  }
}

console.log(
  `Package verified: ${path.relative(root, app)}, app.asar ${(asarSize / 1024 / 1024).toFixed(1)} MiB, locales ${applicationLocales.join(", ")}`,
);
