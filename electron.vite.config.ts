import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import type { Plugin } from "vite";

const developmentWebSockets = " ws://localhost:* ws://127.0.0.1:*";

const productionCsp: Plugin = {
  name: "alu-production-csp",
  apply: "build",
  transformIndexHtml(html) {
    return html.replace(developmentWebSockets, "");
  },
};

export default defineConfig({
  main: {
    build: {
      outDir: "dist/main",
    },
  },
  preload: {
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
        },
      },
    },
  },
  renderer: {
    plugins: [react(), productionCsp],
    build: {
      outDir: "dist/renderer",
      emptyOutDir: true,
    },
  },
});
