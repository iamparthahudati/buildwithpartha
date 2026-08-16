import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";

import { createViteConfig } from "./vite.config.ts";

export default defineConfig((configEnvironment) =>
  mergeConfig(
    createViteConfig(configEnvironment),
    defineConfig({
      test: {
        environment: "jsdom",
        include: ["src/**/*.test.{ts,tsx}"],
        setupFiles: ["./src/test/setup.ts"],
        coverage: {
          provider: "v8",
          include: ["src/**/*.{ts,tsx}"],
          exclude: [
            "src/**/*.test.{ts,tsx}",
            "src/**/index.ts",
            "src/main.tsx",
            "src/catalog/main.tsx",
            "src/test/**",
          ],
          reporter: ["text", "html", "json-summary", "lcov"],
          thresholds: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },
    }),
  ),
);
