import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/life-os/",
  plugins: [react()],
  appType: "spa",
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
