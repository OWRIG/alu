import { chmod } from "node:fs/promises";
import path from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: "src/cli/index.ts",
    outDir: "dist/cli",
    emptyOutDir: true,
    target: "node22",
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: "alu.mjs",
        format: "es",
      },
    },
  },
  ssr: {
    noExternal: true,
  },
  plugins: [
    {
      name: "alu-cli-executable",
      async closeBundle() {
        await chmod(path.resolve("dist/cli/alu.mjs"), 0o755);
      },
    },
  ],
});
