import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";

import { validatePublicEnvironment } from "./src/app/environment.ts";

const testEnvironment = {
  VITE_APP_BASE_PATH: "/life-os/",
  VITE_API_BASE_PATH: "/life-os/api/v1",
};

export function createViteConfig({ mode }: ConfigEnv): UserConfig {
  const projectRoot = decodeURIComponent(new URL(".", import.meta.url).pathname);
  const source = mode === "test" ? testEnvironment : loadEnv(mode, projectRoot, "VITE_");
  const environment = validatePublicEnvironment(source);
  const apiRootPath = `${environment.appBasePath.replace(/\/$/, "")}/api`;
  const apiProxy = {
    [`^${escapeRegularExpression(apiRootPath)}(?:/|$)`]: {
      target: "http://127.0.0.1:8080",
      changeOrigin: false,
    },
  };

  return {
    base: environment.appBasePath,
    define: {
      "import.meta.env.VITE_APP_BASE_PATH": JSON.stringify(environment.appBasePath),
      "import.meta.env.VITE_API_BASE_PATH": JSON.stringify(environment.apiBasePath),
    },
    plugins: [react()],
    appType: "spa",
    resolve: {
      alias: {
        "@app": new URL("./src/app", import.meta.url).pathname,
        "@assets": new URL("./src/assets", import.meta.url).pathname,
        "@catalog": new URL("./src/catalog", import.meta.url).pathname,
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
      proxy: apiProxy,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
      proxy: apiProxy,
    },
    build: {
      target: "baseline-widely-available",
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        // Named explicitly so `catalog.html` can never become a build input.
        // The component catalog is a development tool and must not ship.
        input: new URL("./index.html", import.meta.url).pathname,
      },
    },
  };
}

export default defineConfig(createViteConfig);

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
