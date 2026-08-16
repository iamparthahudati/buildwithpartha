import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/life-os/",
  plugins: [react()],
  appType: "spa",
  resolve: {
    alias: {
      "@app": new URL("./src/app", import.meta.url).pathname,
      "@assets": new URL("./src/assets", import.meta.url).pathname,
      "@components": new URL("./src/components", import.meta.url).pathname,
      "@features": new URL("./src/features", import.meta.url).pathname,
      "@hooks": new URL("./src/hooks", import.meta.url).pathname,
      "@lib": new URL("./src/lib", import.meta.url).pathname,
      "@routes": new URL("./src/routes", import.meta.url).pathname,
      "@state": new URL("./src/state", import.meta.url).pathname,
      "@styles": new URL("./src/styles", import.meta.url).pathname,
      "@test": new URL("./src/test", import.meta.url).pathname,
      "@types": new URL("./src/types", import.meta.url).pathname,
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  build: {
    target: "baseline-widely-available",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
