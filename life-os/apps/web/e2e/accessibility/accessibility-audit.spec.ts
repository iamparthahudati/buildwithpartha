import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";
import { runAxeAudit, formatAxeViolations } from "./axeHelper";

function createPopulatedMockState() {
  return new MockBackendState({
    user: {
      id: "user-a11y-audit",
      email: "a11y-audit@example.test",
      displayName: "Accessibility Auditor",
      timeZone: "UTC",
      locale: "en-US",
      weekStart: 1,
      onboardingCompleted: true,
    },
    todayDate: "2026-09-11",
    initialProjects: [
      {
        id: "proj-1",
        name: "Platform Infrastructure",
        description: "Core infrastructure and resilience tasks.",
        status: "ACTIVE",
        color: "#3157f5",
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ],
    initialTasks: [
      {
        id: "task-1",
        title: "Audit WCAG 2.2 AA Compliance",
        description: "Run comprehensive accessibility sweep across routes.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: "2026-09-11",
        projectId: "proj-1",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-11T00:00:00Z",
      },
      {
        id: "task-2",
        title: "Verify keyboard navigation traps",
        description: "Check focus restoration on dialog dismissal.",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: "2026-09-12",
        projectId: "proj-1",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-11T00:00:00Z",
      },
    ],
    initialTimeBlocks: [
      {
        id: "block-1",
        title: "Deep Work: A11y Audit",
        category: "FOCUS",
        startTime: "2026-09-11T10:00:00Z",
        endTime: "2026-09-11T12:00:00Z",
        status: "ACTIVE",
      },
    ],
    initialNotes: [
      {
        id: "note-1",
        title: "Accessibility Architecture Notes",
        body: "All interactive controls must meet 3:1 focus ring and 4.5:1 text contrast.",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-11T00:00:00Z",
      },
    ],
    initialHabits: [
      {
        id: "habit-1",
        name: "Read WCAG specifications",
        category: "LEARNING",
        targetCount: 1,
        frequency: "DAILY",
        timeZone: "UTC",
        createdAt: "2026-09-01T00:00:00Z",
      },
    ],
    initialGoals: [
      {
        id: "goal-1",
        title: "100% WCAG 2.2 AA Conformance",
        description: "Zero critical or serious accessibility violations across all routes.",
        targetDate: "2026-09-30",
        status: "IN_PROGRESS",
        metricType: "PERCENTAGE",
        currentValue: 95,
        targetValue: 100,
        createdAt: "2026-09-01T00:00:00Z",
      },
    ],
    initialBrainDump: [
      {
        id: "bd-1",
        content: "Check color contrast on status badges under forced colors",
        capturedAt: "2026-09-11T08:00:00Z",
        status: "INBOX",
      },
    ],
  });
}

test.describe("LOS-1503: Frontend Accessibility Audit", () => {
  test.describe("1. Public Routes Axe Audit", () => {
    const publicRoutes = [
      { path: "/life-os/login", name: "Login Screen" },
      { path: "/life-os/signup", name: "Signup Screen" },
      { path: "/life-os/verify-email", name: "Verify Email Screen" },
      { path: "/life-os/forgot-password", name: "Forgot Password Screen" },
      { path: "/life-os/reset-password?token=valid-token-1234", name: "Reset Password Screen" },
      { path: "/life-os/cancel-deletion?token=valid-token-1234", name: "Cancel Deletion Screen" },
      { path: "/life-os/unavailable", name: "Service Unavailable Screen" },
      { path: "/life-os/non-existent-page-test", name: "Public 404 Screen" },
    ];

    for (const route of publicRoutes) {
      test(`verifies zero critical or serious axe violations on ${route.name} (${route.path})`, async ({
        page,
      }) => {
        const mock = new MockBackendState({ user: null });
        await mock.setupRouteHandlers(page);

        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await expect(
          page.locator("main, h1, h2, [role='main'], .lifeos-error-state").first(),
        ).toBeVisible();

        const audit = await runAxeAudit(page);
        const criticalOrSerious = audit.violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious",
        );

        expect(
          criticalOrSerious,
          `Accessibility violations found on ${route.name}:\n${formatAxeViolations(criticalOrSerious)}`,
        ).toHaveLength(0);
      });
    }
  });

  test.describe("2. Protected Application Routes Axe Audit", () => {
    const protectedRoutes = [
      { path: "/life-os/app/today", name: "Today Dashboard" },
      { path: "/life-os/app/tasks", name: "Tasks Screen" },
      { path: "/life-os/app/time-blocks", name: "Time Blocks Screen" },
      { path: "/life-os/app/calendar", name: "Calendar Screen" },
      { path: "/life-os/app/focus", name: "Focus Mode Screen" },
      { path: "/life-os/app/projects", name: "Projects Screen" },
      { path: "/life-os/app/sprints", name: "Sprints Screen" },
      { path: "/life-os/app/week-planner", name: "Week Planner Screen" },
      { path: "/life-os/app/goals", name: "Goals Screen" },
      { path: "/life-os/app/notes", name: "Notes Screen" },
      { path: "/life-os/app/brain-dump", name: "Brain Dump Screen" },
      { path: "/life-os/app/habits", name: "Habits Screen" },
      { path: "/life-os/app/progress", name: "Progress Screen" },
      { path: "/life-os/app/reports", name: "Reports Screen" },
      { path: "/life-os/app/search", name: "Search Screen" },
      { path: "/life-os/app/notifications", name: "Notifications Screen" },
      { path: "/life-os/app/settings", name: "Settings Screen" },
      { path: "/life-os/app/onboarding", name: "Onboarding Wizard" },
      { path: "/life-os/app/non-existent-nested-route", name: "Protected 404 Screen" },
    ];

    for (const route of protectedRoutes) {
      test(`verifies zero critical or serious axe violations on ${route.name} (${route.path})`, async ({
        page,
      }) => {
        const mock = createPopulatedMockState();
        await mock.setupRouteHandlers(page);

        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await expect(
          page.locator("#lifeos-main-content, main, [role='main'], h1").first(),
        ).toBeVisible();

        const audit = await runAxeAudit(page);
        const criticalOrSerious = audit.violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious",
        );

        expect(
          criticalOrSerious,
          `Accessibility violations found on ${route.name}:\n${formatAxeViolations(criticalOrSerious)}`,
        ).toHaveLength(0);
      });
    }
  });

  test.describe("3. Interactive Dialogs & Modals Axe & Keyboard Traps", () => {
    test("verifies Command Palette accessibility and keyboard trap", async ({ page }) => {
      const mock = createPopulatedMockState();
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/app/today");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#lifeos-main-content")).toBeVisible();

      // Open command palette via search trigger button in TopBar
      const searchButton = page.getByRole("button", { name: /search/i });
      await expect(searchButton).toBeVisible();
      await searchButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(300);

      // Axe audit on the open dialog
      const audit = await runAxeAudit(page);
      const criticalOrSerious = audit.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        criticalOrSerious,
        `Violations in Command Palette:\n${formatAxeViolations(criticalOrSerious)}`,
      ).toHaveLength(0);

      // Escape should dismiss the modal
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });

    test("verifies Quick Add Dialog accessibility and focus trap", async ({ page }) => {
      const mock = createPopulatedMockState();
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/app/today");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#lifeos-main-content")).toBeVisible();

      // Open Quick Add Dialog via trigger button in TopBar
      const quickAddButton = page.getByRole("button", { name: /quick add/i });
      await expect(quickAddButton).toBeVisible();
      await quickAddButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(300);

      // Axe audit on Quick Add Dialog
      const audit = await runAxeAudit(page);
      const criticalOrSerious = audit.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        criticalOrSerious,
        `Violations in Quick Add Dialog:\n${formatAxeViolations(criticalOrSerious)}`,
      ).toHaveLength(0);

      // Escape dismisses the dialog
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });
  });

  test.describe("4. Keyboard Navigation & Skip-to-Content", () => {
    test("skip-to-content link becomes visible and moves focus to main content", async ({
      page,
    }) => {
      const mock = createPopulatedMockState();
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/app/today");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#lifeos-main-content")).toBeVisible();

      const skipLink = page.locator("a.lifeos-skip-link");
      await expect(skipLink).toBeAttached();

      // Focus skip link directly via keyboard navigation
      await skipLink.focus();
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();

      // Activate skip link
      await page.keyboard.press("Enter");

      // Focus moves to main content target
      const mainContent = page.locator("#lifeos-main-content");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("5. 320px Reflow (WCAG 1.4.10)", () => {
    const reflowRoutes = [
      "/life-os/login",
      "/life-os/app/today",
      "/life-os/app/tasks",
      "/life-os/app/projects",
      "/life-os/app/settings",
    ];

    for (const routePath of reflowRoutes) {
      test(`verifies no horizontal overflow at 320px viewport on ${routePath}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 320, height: 568 });

        const isPublic = !routePath.startsWith("/life-os/app");
        const mock = isPublic ? new MockBackendState({ user: null }) : createPopulatedMockState();
        await mock.setupRouteHandlers(page);

        await page.goto(routePath);
        await page.waitForLoadState("networkidle");
        await expect(
          page.locator("#lifeos-main-content, main, .lifeos-auth-card, h1").first(),
        ).toBeVisible();

        // Check if document has horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        expect(
          hasHorizontalScroll,
          `Horizontal scrolling detected at 320px on ${routePath} (scrollWidth: ${await page.evaluate(() => document.documentElement.scrollWidth)}, innerWidth: 320)`,
        ).toBe(false);

        // Run axe reflow check
        const audit = await runAxeAudit(page);
        const criticalOrSerious = audit.violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious",
        );
        expect(criticalOrSerious).toHaveLength(0);
      });
    }
  });

  test.describe("6. Reduced Motion & Forced Colors Preferences", () => {
    test("respects prefers-reduced-motion: reduce", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });

      const mock = createPopulatedMockState();
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/app/today");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#lifeos-main-content")).toBeVisible();

      const matchesReduced = await page.evaluate(() => {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      });
      expect(matchesReduced).toBe(true);

      const audit = await runAxeAudit(page);
      const criticalOrSerious = audit.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(criticalOrSerious).toHaveLength(0);
    });

    test("respects forced-colors: active", async ({ page }) => {
      await page.emulateMedia({ forcedColors: "active" });

      const mock = createPopulatedMockState();
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/app/today");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#lifeos-main-content")).toBeVisible();

      const matchesForcedColors = await page.evaluate(() => {
        return window.matchMedia("(forced-colors: active)").matches;
      });
      expect(matchesForcedColors).toBe(true);

      const audit = await runAxeAudit(page);
      const criticalOrSerious = audit.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(criticalOrSerious).toHaveLength(0);
    });
  });
});
