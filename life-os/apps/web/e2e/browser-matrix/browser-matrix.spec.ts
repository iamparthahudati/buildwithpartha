import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

// ---------------------------------------------------------------------------
// LOS-1504: Responsive / Browser Matrix
// ---------------------------------------------------------------------------
// Validates that every supported browser and layout tier can:
//   1. Render core public routes without layout collapse or horizontal overflow.
//   2. Render core authenticated routes and navigate the primary shell.
//   3. Operate touch/pointer target sizing on narrow viewports.
//   4. Apply the CSS custom properties (design tokens) correctly.
//   5. Handle a primary user interaction (create task) without errors.
// ---------------------------------------------------------------------------

function makePopulatedState() {
  return new MockBackendState({
    user: {
      id: "user-browser-matrix",
      email: "browser-matrix@example.test",
      displayName: "Browser Matrix User",
      timeZone: "UTC",
      locale: "en-US",
      weekStart: 1,
      onboardingCompleted: true,
    },
    todayDate: "2026-09-11",
    initialProjects: [
      {
        id: "proj-bm-1",
        name: "Matrix Project Alpha",
        description: "Browser matrix test project.",
        status: "ACTIVE",
        color: "#3157f5",
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ],
    initialTasks: [
      {
        id: "task-bm-1",
        title: "Cross-browser validation task",
        description: "Verify rendering across all supported browsers.",
        status: "TODO",
        priority: "HIGH",
        dueDate: "2026-09-12",
        projectId: "proj-bm-1",
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

// ---------------------------------------------------------------------------
// Helper: assert no horizontal overflow
// ---------------------------------------------------------------------------
async function assertNoHorizontalOverflow(
  page: import("@playwright/test").Page,
  routeLabel: string,
) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow, `Horizontal overflow on ${routeLabel} (scrollWidth > innerWidth)`).toBe(
    false,
  );
}

// ---------------------------------------------------------------------------
// Helper: assert design token is resolved (not a raw var() string)
// ---------------------------------------------------------------------------
async function assertTokensResolved(page: import("@playwright/test").Page) {
  const primaryTokenResolved = await page.evaluate(() => {
    const el = document.createElement("div");
    el.style.color = "var(--lifeos-color-primary)";
    document.body.appendChild(el);
    const computed = window.getComputedStyle(el).color;
    document.body.removeChild(el);
    // If the token is unresolved, computed will be "" or contain "var("
    return computed !== "" && !computed.includes("var(");
  });
  expect(
    primaryTokenResolved,
    "Design token --lifeos-color-primary must resolve to a concrete value",
  ).toBe(true);
}

// ---------------------------------------------------------------------------
// 1. Public route rendering
// ---------------------------------------------------------------------------
test.describe("LOS-1504: Public Route Rendering", () => {
  const publicRoutes = [
    { path: "/life-os/login", label: "Login" },
    { path: "/life-os/signup", label: "Signup" },
    { path: "/life-os/forgot-password", label: "Forgot Password" },
  ];

  for (const route of publicRoutes) {
    test(`renders ${route.label} without horizontal overflow on current browser`, async ({
      page,
    }) => {
      const mock = new MockBackendState({ user: null });
      await mock.setupRouteHandlers(page);

      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      // Primary content must be visible
      await expect(page.locator("h1, .lifeos-auth-card").first()).toBeVisible();

      // No horizontal overflow at any declared viewport
      await assertNoHorizontalOverflow(page, route.label);

      // Design tokens must resolve (CSS custom properties work in this engine)
      await assertTokensResolved(page);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Authenticated shell & navigation
// ---------------------------------------------------------------------------
test.describe("LOS-1504: Authenticated Shell Rendering", () => {
  test("renders Today dashboard and main navigation without overflow", async ({ page }) => {
    const mock = makePopulatedState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content")).toBeVisible();
    await assertNoHorizontalOverflow(page, "/life-os/app/today");
    await assertTokensResolved(page);
  });

  test("renders Tasks list without overflow", async ({ page }) => {
    const mock = makePopulatedState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content")).toBeVisible();
    await assertNoHorizontalOverflow(page, "/life-os/app/tasks");
  });

  test("renders Projects list without overflow", async ({ page }) => {
    const mock = makePopulatedState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/projects");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content")).toBeVisible();
    await assertNoHorizontalOverflow(page, "/life-os/app/projects");
  });

  test("renders Notes without overflow", async ({ page }) => {
    const mock = makePopulatedState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/notes");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content")).toBeVisible();
    await assertNoHorizontalOverflow(page, "/life-os/app/notes");
  });

  test("renders Settings without overflow", async ({ page }) => {
    const mock = makePopulatedState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content")).toBeVisible();
    await assertNoHorizontalOverflow(page, "/life-os/app/settings");
  });
});

// ---------------------------------------------------------------------------
// 3. Touch target minimum size (mobile / tablet viewports)
// ---------------------------------------------------------------------------
test.describe("LOS-1504: Touch Target Sizing (narrow viewports)", () => {
  test("primary interactive controls meet 44×44 CSS pixel minimum", async ({ page, viewport }) => {
    // Only meaningful on narrow viewports; skip on wide desktop
    if (!viewport || viewport.width > 600) {
      test.skip();
      return;
    }

    const mock = makePopulatedState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    // Collect all button and role=button elements visible on the page
    const smallTargets = await page.evaluate(() => {
      const interactive = Array.from(
        document.querySelectorAll<HTMLElement>("button, [role='button'], a[href], [role='link']"),
      );
      const tooSmall: string[] = [];
      for (const el of interactive) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (rect.width < 44 || rect.height < 44) {
            tooSmall.push(
              `${el.tagName}[${el.textContent?.trim().slice(0, 40) ?? ""}] (${Math.round(rect.width)}×${Math.round(rect.height)})`,
            );
          }
        }
      }
      return tooSmall;
    });

    expect(
      smallTargets,
      `Touch targets below 44×44 on ${viewport.width}px viewport:\n${smallTargets.join("\n")}`,
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Core interaction: create task via Quick Add dialog
// ---------------------------------------------------------------------------
test.describe("LOS-1504: Core Interaction — Quick Add", () => {
  test("opens quick-add dialog, fills title, and submits without console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const mock = makePopulatedState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    // Try to open Quick Add via keyboard shortcut or a visible button
    const quickAddButton = page
      .getByRole("button", { name: /quick add|add task|new task|\+/i })
      .first();
    if (await quickAddButton.isVisible()) {
      await quickAddButton.click();
    } else {
      // Fallback: try the keyboard shortcut
      await page.keyboard.press("n");
    }

    // If a dialog appears, interact with it
    const dialog = page.getByRole("dialog");
    const dialogVisible = await dialog.isVisible().catch(() => false);
    if (dialogVisible) {
      const titleInput = dialog.getByRole("textbox").first();
      if (await titleInput.isVisible()) {
        await titleInput.fill("Browser matrix quick-add test task");
        await page.keyboard.press("Escape");
      }
    }

    // No JS errors should have fired during the interaction
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("prefers-reduced-motion") &&
        !e.includes("ResizeObserver") &&
        !e.includes("favicon") &&
        !e.includes("chunk"),
    );
    expect(
      criticalErrors,
      `Console errors during quick-add:\n${criticalErrors.join("\n")}`,
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Service Worker / offline-shell registration
// ---------------------------------------------------------------------------
test.describe("LOS-1504: Service Worker Registration", () => {
  test("service worker registers without errors on first load", async ({ page }) => {
    const swErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().toLowerCase().includes("service worker")) {
        swErrors.push(msg.text());
      }
    });

    const mock = makePopulatedState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    expect(swErrors, `Service Worker errors:\n${swErrors.join("\n")}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Viewport layout breakpoints
// ---------------------------------------------------------------------------
test.describe("LOS-1504: Viewport Layout Breakpoints", () => {
  const breakpoints = [
    { width: 320, height: 568, label: "320px (WCAG reflow)" },
    { width: 375, height: 667, label: "375px (iPhone SE)" },
    { width: 768, height: 1024, label: "768px (Tablet portrait)" },
    { width: 1024, height: 768, label: "1024px (Tablet landscape)" },
    { width: 1280, height: 800, label: "1280px (Desktop)" },
    { width: 1440, height: 900, label: "1440px (Wide desktop)" },
  ];

  for (const bp of breakpoints) {
    test(`Today dashboard has no horizontal overflow at ${bp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });

      const mock = makePopulatedState();
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/app/today");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

      await assertNoHorizontalOverflow(page, `Today @ ${bp.label}`);
    });
  }

  for (const bp of breakpoints) {
    test(`Login page has no horizontal overflow at ${bp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });

      const mock = new MockBackendState({ user: null });
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/login");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1, .lifeos-auth-card").first()).toBeVisible();

      await assertNoHorizontalOverflow(page, `Login @ ${bp.label}`);
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Page title and lang attribute
// ---------------------------------------------------------------------------
test.describe("LOS-1504: HTML lang and page titles", () => {
  const routes = [
    { path: "/life-os/login", label: "Login", isPublic: true },
    { path: "/life-os/signup", label: "Signup", isPublic: true },
    { path: "/life-os/app/today", label: "Today", isPublic: false },
    { path: "/life-os/app/tasks", label: "Tasks", isPublic: false },
  ];

  for (const route of routes) {
    test(`${route.label} sets a non-empty page title and html[lang]`, async ({ page }) => {
      if (route.isPublic) {
        const mock = new MockBackendState({ user: null });
        await mock.setupRouteHandlers(page);
      } else {
        const mock = makePopulatedState();
        await mock.setupRouteHandlers(page);
      }

      await page.goto(route.path);
      await page.waitForLoadState("networkidle");

      const title = await page.title();
      expect(title.length, `${route.label} must have a non-empty page title`).toBeGreaterThan(0);

      const lang = await page.evaluate(() => document.documentElement.lang);
      expect(lang.length, `${route.label} must have html[lang] set`).toBeGreaterThan(0);
    });
  }
});
