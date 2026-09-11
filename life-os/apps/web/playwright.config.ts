import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.LIFEOS_E2E_PORT ?? 14173);
const baseURL = process.env.LIFEOS_E2E_BASE_URL ?? `http://127.0.0.1:${port}/life-os/`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    locale: "en-US",
    timezoneId: "UTC",
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(process.platform === "darwin" && {
        channel: "chrome",
      }),
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
  webServer: process.env.LIFEOS_E2E_EXTERNAL_SERVER
    ? undefined
    : {
        command: "npm run preview -- --host 127.0.0.1 --port " + port,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
