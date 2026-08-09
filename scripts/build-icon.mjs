import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "build", "icon.svg");
const output = path.join(root, "build", "icon.icns");
const temporary = await mkdtemp(path.join(os.tmpdir(), "alu-icon-"));
const iconset = path.join(temporary, "icon.iconset");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
}

try {
  await mkdir(iconset);
  run("qlmanage", ["-t", "-s", "1024", "-o", temporary, source]);
  const raster = path.join(temporary, "icon.svg.png");
  const variants = [
    [16, "icon_16x16.png"],
    [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"],
    [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"],
    [1024, "icon_512x512@2x.png"],
  ];
  for (const [size, name] of variants) {
    run("sips", ["-z", String(size), String(size), raster, "--out", path.join(iconset, name)]);
  }
  run("iconutil", ["-c", "icns", iconset, "-o", output]);
  console.log(`Wrote ${path.relative(root, output)}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
