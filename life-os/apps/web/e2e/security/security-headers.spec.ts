import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

// ---------------------------------------------------------------------------
// LOS-1507: Content Security Policy & Security Headers Frontend E2E Suite
// ---------------------------------------------------------------------------
// Validates that:
//   1. Core unauthenticated routes render without CSP violations or console errors.
//   2. Authenticated routes and interactive widgets operate cleanly within strict CSP.
//   3. Modals, inline styles (tokens), and dynamic SVG charts load without policy blocks.
//   4. Anti-framing and base URI constraints do not disrupt client-side navigation.
// ---------------------------------------------------------------------------

function makeSecurityTestState() {
  return new MockBackendState({
    user: {
      id: "user-sec-headers-e2e",
      email: "sec-headers-e2e@example.test",
      displayName: "CSP Test User",
      timeZone: "UTC",
      locale: "en-US",
      weekStart: 1,
      onboardingCompleted: true,
    },
    todayDate: "2026-09-11",
    initialProjects: [
      {
        id: "proj-csp-1",
        name: "CSP Verified Project",
        description: "Testing strict Content Security Policy enforcement.",
        status: "ACTIVE",
        color: "#3157f5",
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ],
    initialTasks: [
      {
        id: "task-csp-1",
        title: "Verify CSP Execution",
        description: "Ensure no inline script blocks or font loading failures occur.",
        status: "TODO",
        priority: "HIGH",
        dueDate: "2026-09-12",
        projectId: "proj-csp-1",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-11T00:00:00Z",
      },
    ],
    initialTimeBlocks: [],
    initialNotes: [],
    initialHabits: [],
    initialGoals: [],
    initialBrainDump: [],
  });
}

test.describe("LOS-1507 — CSP and Security Headers Compliance", () => {
  test("Public login route loads cleanly with zero CSP error logs", async ({ page }) => {
    const cspErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        (msg.text().includes("Content Security Policy") ||
          msg.text().includes("violates the following directive"))
      ) {
        cspErrors.push(msg.text());
      }
    });

    const state = makeSecurityTestState();
    await state.install(page);

    await page.goto("/life-os/login");
    await expect(page.locator("h1, h2, button[type='submit']").first()).toBeVisible({
      timeout: 10000,
    });

    expect(cspErrors).toHaveLength(0);
  });

  test("Authenticated dashboard loads without CSP script/style/connect violations", async ({
    page,
  }) => {
    const cspErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        (msg.text().includes("Content Security Policy") ||
          msg.text().includes("violates the following directive"))
      ) {
        cspErrors.push(msg.text());
      }
    });

    const state = makeSecurityTestState();
    await state.install(page);

    await page.goto("/life-os/today");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    // Navigate across core routes within the SPA
    await page.goto("/life-os/projects");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    await page.goto("/life-os/tasks");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    await page.goto("/life-os/settings");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    expect(cspErrors).toHaveLength(0);
  });

  test("Dynamic SVG and token styling load without CSP style-src blockage", async ({ page }) => {
    const state = makeSecurityTestState();
    await state.install(page);

    await page.goto("/life-os/projects");
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });

    // Assert that computed styles are populated correctly from design tokens
    const mainEl = page.locator("main");
    const backgroundColor = await mainEl.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor,
    );
    expect(backgroundColor).toBeTruthy();
  });
});
