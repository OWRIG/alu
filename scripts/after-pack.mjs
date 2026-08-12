import { cp, rm } from "node:fs/promises";
import path from "node:path";

export default async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const projectDirectory = context.packager.projectDir;
  const applicationResources = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    "Contents",
    "Resources",
  );
  const electronResources = path.join(
    projectDirectory,
    "node_modules",
    "electron",
    "dist",
    "Electron.app",
    "Contents",
    "Resources",
  );

  await Promise.all([
    rm(path.join(applicationResources, "default_app.asar"), { force: true }),
    rm(path.join(applicationResources, "default_app.asar.unpacked"), {
      recursive: true,
      force: true,
    }),
    cp(path.join(electronResources, "en.lproj"), path.join(applicationResources, "en.lproj"), {
      recursive: true,
      force: true,
    }),
    cp(
      path.join(electronResources, "zh_CN.lproj"),
      path.join(applicationResources, "zh_CN.lproj"),
      { recursive: true, force: true },
    ),
  ]);
}
