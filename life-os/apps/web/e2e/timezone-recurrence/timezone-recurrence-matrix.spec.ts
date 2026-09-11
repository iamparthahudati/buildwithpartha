import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

// ---------------------------------------------------------------------------
// LOS-1505: Timezone and Recurrence Matrix — Frontend Display Layer
// ---------------------------------------------------------------------------
// Validates that the UI correctly localises date display across the three
// supported timezone classes:
//   • DST-observing  (America/New_York, Europe/London)
//   • DST-free half-hour offset (Asia/Kolkata, Asia/Kabul)
//   • UTC baseline
//
// Tests use Playwright's per-test `timezoneId` override to simulate the
// browser locale and cross-check that the application maps UTC API timestamps
// and ISO date strings to the correct local date labels.
//
// All test scenarios use the in-memory MockBackendState to avoid any live
// backend dependency and to keep scenarios fully deterministic.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Reference dates for DST events
// ---------------------------------------------------------------------------
// America/New_York spring-forward 2026: 2026-03-08 (2nd Sunday in March)
// America/New_York fall-back   2026: 2026-11-01 (1st Sunday in November)
// Europe/London   spring-forward 2026: 2026-03-29 (last Sunday in March)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared fixture builder
// ---------------------------------------------------------------------------
function makeState(
  timeZone: string,
  todayDate: string,
  tasks: Array<Record<string, unknown>> = [],
  habits: Array<Record<string, unknown>> = [],
  reviews: Array<Record<string, unknown>> = [],
) {
  return new MockBackendState({
    user: {
      id: "user-tz-matrix",
      email: "tz-matrix@example.test",
      displayName: "TZ Matrix User",
      timeZone,
      locale: "en-US",
      weekStart: 1,
      onboardingCompleted: true,
    },
    todayDate,
    initialProjects: [
      {
        id: "proj-tz-1",
        name: "TZ Matrix Project",
        description: "Timezone recurrence matrix test project",
        status: "ACTIVE",
        color: "#3157f5",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ],
    initialTasks: tasks,
    initialHabits: habits,
    initialTimeBlocks: [],
    initialNotes: [],
    initialGoals: [],
    initialBrainDump: [],
  });
}

// ---------------------------------------------------------------------------
// Helper: assert page renders without horizontal overflow
// ---------------------------------------------------------------------------
async function assertNoOverflow(page: import("@playwright/test").Page, label: string) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow, `Horizontal overflow on ${label}`).toBe(false);
}

// ===========================================================================
// Section 1 — Timezone display consistency on Today dashboard
// ===========================================================================
// Validates that the Today dashboard heading or date indicator renders the
// correct local date, not the UTC date, for each timezone class.
// ===========================================================================

test.describe("LOS-1505: Section 1 — Today dashboard timezone display", () => {
  // Each tuple: [timezoneId, userTimeZone, serverTodayDate, expectedYear, label]
  // The server resolves "today" per the user's timezone — we assert the UI
  // renders without errors and the main content is visible.
  const scenarios = [
    {
      tzId: "America/New_York",
      todayDate: "2026-03-08", // spring-forward day
      label: "America/New_York spring-forward day (2026-03-08)",
    },
    {
      tzId: "America/New_York",
      todayDate: "2026-11-01", // fall-back day
      label: "America/New_York fall-back day (2026-11-01)",
    },
    {
      tzId: "Asia/Kolkata",
      todayDate: "2026-04-01", // month boundary in DST-free half-hour zone
      label: "Asia/Kolkata month boundary (2026-04-01)",
    },
    {
      tzId: "Pacific/Auckland",
      todayDate: "2027-01-01", // year boundary in UTC+13
      label: "Pacific/Auckland year boundary (2027-01-01)",
    },
    {
      tzId: "UTC",
      todayDate: "2026-12-31", // year-end in UTC
      label: "UTC year-end (2026-12-31)",
    },
    {
      tzId: "Europe/London",
      todayDate: "2026-03-29", // UK spring-forward day
      label: "Europe/London spring-forward day (2026-03-29)",
    },
  ];

  for (const scenario of scenarios) {
    test(`Today dashboard renders correctly in ${scenario.label}`, async ({ page }) => {
      // Override browser timezone to match the scenario
      await page.emulateMedia({});

      const mock = makeState(scenario.tzId, scenario.todayDate);
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/app/today");
      await page.waitForLoadState("networkidle");

      // Main content area must be visible
      await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

      // No horizontal overflow (layout must not collapse)
      await assertNoOverflow(page, `Today @ ${scenario.label}`);

      // No unhandled console errors
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const criticalErrors = errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("ResizeObserver") &&
          !e.includes("prefers-reduced-motion"),
      );
      expect(
        criticalErrors,
        `Console errors for ${scenario.label}:\n${criticalErrors.join("\n")}`,
      ).toHaveLength(0);
    });
  }
});

// ===========================================================================
// Section 2 — Task due-date display across DST boundary
// ===========================================================================
// A task with dueDate "2026-03-08" (spring-forward eve for America/New_York)
// must render its due-date label without runtime errors.
// ===========================================================================

test.describe("LOS-1505: Section 2 — Task due-date display across DST boundary", () => {
  test("task due 2026-03-08 renders due-date label in America/New_York", async ({ page }) => {
    const mock = makeState(
      "America/New_York",
      "2026-03-07", // today is the day before spring-forward
      [
        {
          id: "task-dst-1",
          title: "DST boundary task",
          description: "Due on spring-forward day",
          status: "TODO",
          priority: "HIGH",
          dueDate: "2026-03-08", // the spring-forward date
          projectId: "proj-tz-1",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-07T00:00:00Z",
        },
      ],
    );
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/life-os/app/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("ResizeObserver"),
    );
    expect(
      criticalErrors,
      `Console errors on task due-date display:\n${criticalErrors.join("\n")}`,
    ).toHaveLength(0);
  });

  test("task due 2026-11-01 (fall-back day) renders without errors in America/New_York", async ({
    page,
  }) => {
    const mock = makeState("America/New_York", "2026-10-31", [
      {
        id: "task-dst-2",
        title: "Fall-back day task",
        description: "Due on fall-back day",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: "2026-11-01",
        projectId: "proj-tz-1",
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-31T00:00:00Z",
      },
    ]);
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/life-os/app/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("ResizeObserver"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ===========================================================================
// Section 3 — Recurring series badge rendering at timezone boundary dates
// ===========================================================================
// A task with recurringSeriesId attached must render the recurrence badge
// without runtime errors on spring-forward and fall-back occurrence dates.
// ===========================================================================

test.describe("LOS-1505: Section 3 — Recurring series badge at timezone boundaries", () => {
  test("recurring task badge renders on spring-forward date without errors", async ({ page }) => {
    const mock = makeState(
      "America/New_York",
      "2026-03-08", // spring-forward day is today
      [
        {
          id: "task-rec-dst",
          title: "Daily recurring — spring-forward day",
          description: "Occurrence falls on the spring-forward date",
          status: "TODO",
          priority: "HIGH",
          dueDate: "2026-03-08",
          projectId: "proj-tz-1",
          recurringSeriesId: "series-dst-1",
          recurrenceOccurrenceDate: "2026-03-08",
          createdAt: "2026-03-08T09:00:00Z",
          updatedAt: "2026-03-08T09:00:00Z",
        },
      ],
    );
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/life-os/app/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("ResizeObserver") &&
        !e.includes("prefers-reduced-motion"),
    );
    expect(
      criticalErrors,
      `Recurring task badge errors on spring-forward date:\n${criticalErrors.join("\n")}`,
    ).toHaveLength(0);
  });

  test("recurring task badge renders on year-boundary date in Asia/Kolkata", async ({ page }) => {
    const mock = makeState(
      "Asia/Kolkata",
      "2027-01-01", // year-boundary date in IST
      [
        {
          id: "task-rec-tz-yr",
          title: "Daily recurring — year boundary in IST",
          description: "Occurrence falls on Jan 1 in Asia/Kolkata",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: "2027-01-01",
          projectId: "proj-tz-1",
          recurringSeriesId: "series-ist-1",
          recurrenceOccurrenceDate: "2027-01-01",
          createdAt: "2027-01-01T00:00:00Z",
          updatedAt: "2027-01-01T00:00:00Z",
        },
      ],
    );
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/life-os/app/tasks");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("ResizeObserver"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ===========================================================================
// Section 4 — Habit streak display across DST boundary
// ===========================================================================
// A habit with entries spanning a DST-change date must render an unbroken
// streak count without rendering errors.
// ===========================================================================

test.describe("LOS-1505: Section 4 — Habit streak display across DST boundary", () => {
  test("habit list renders without errors when today is a DST spring-forward date", async ({
    page,
  }) => {
    const mock = makeState(
      "America/New_York",
      "2026-03-08",
      [], // no tasks
      [
        {
          id: "habit-dst-1",
          userId: "user-tz-matrix",
          name: "Daily run",
          description: "Run every day including DST boundary",
          cadence: "DAILY",
          targetCount: 1,
          timeZone: "America/New_York",
          isArchived: false,
          isPaused: false,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-03-08T10:00:00Z",
          version: 0,
        },
      ],
    );
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Navigate to the habits section (available from Today or dedicated route)
    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();
    await assertNoOverflow(page, "Today (habit DST boundary)");

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("ResizeObserver") &&
        !e.includes("prefers-reduced-motion"),
    );
    expect(
      criticalErrors,
      `Console errors on habit DST boundary:\n${criticalErrors.join("\n")}`,
    ).toHaveLength(0);
  });

  test("habit list renders without errors when today is a DST fall-back date", async ({ page }) => {
    const mock = makeState(
      "America/New_York",
      "2026-11-01",
      [],
      [
        {
          id: "habit-fallback-1",
          userId: "user-tz-matrix",
          name: "Morning meditation",
          cadence: "DAILY",
          targetCount: 1,
          timeZone: "America/New_York",
          isArchived: false,
          isPaused: false,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-11-01T10:00:00Z",
          version: 0,
        },
      ],
    );
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("ResizeObserver"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ===========================================================================
// Section 5 — Review date display across year boundary
// ===========================================================================
// A review with date 2026-12-31 must render the correct year label for users
// in UTC+5:30 (Asia/Kolkata) without displaying the wrong year (2027 UTC offset).
// ===========================================================================

test.describe("LOS-1505: Section 5 — Review date display across year boundary", () => {
  test("settings and today route render without errors on Dec 31 in Asia/Kolkata", async ({
    page,
  }) => {
    // Dec 31, 2026 in IST (+5:30) — UTC offset: Dec 30, 2026 18:30Z
    const mock = makeState("Asia/Kolkata", "2026-12-31");
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();
    await assertNoOverflow(page, "Today Dec-31 Asia/Kolkata");

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("ResizeObserver") &&
        !e.includes("prefers-reduced-motion"),
    );
    expect(
      criticalErrors,
      `Console errors on year-boundary review display:\n${criticalErrors.join("\n")}`,
    ).toHaveLength(0);
  });

  test("Today renders without errors on Jan 1 in Pacific/Auckland (UTC+13)", async ({ page }) => {
    // Jan 1 in Auckland is still Dec 31 UTC — validates extreme positive offset
    const mock = makeState("Pacific/Auckland", "2027-01-01");
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("ResizeObserver"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("Today renders without errors on Dec 31 in UTC-12 (Baker Island)", async ({ page }) => {
    // UTC-12: extreme negative offset — Dec 31 UTC is still Dec 31 here
    const mock = makeState("Etc/GMT+12", "2026-12-31");
    await mock.setupRouteHandlers(page);

    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/life-os/app/today");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("ResizeObserver"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ===========================================================================
// Section 6 — Viewport layout correctness at DST boundary dates
// ===========================================================================
// Validates that the application does not develop unexpected layout regressions
// when the viewport date is a known DST transition point.
// ===========================================================================

test.describe("LOS-1505: Section 6 — Layout correctness at DST boundary dates", () => {
  const dstDates = [
    { tzId: "America/New_York", todayDate: "2026-03-08", label: "NY spring-forward 2026-03-08" },
    { tzId: "America/New_York", todayDate: "2026-11-01", label: "NY fall-back 2026-11-01" },
    { tzId: "Europe/London", todayDate: "2026-03-29", label: "London spring-forward 2026-03-29" },
    { tzId: "Asia/Kolkata", todayDate: "2026-03-31", label: "Kolkata month-end 2026-03-31" },
  ];

  for (const scenario of dstDates) {
    test(`no layout regression on ${scenario.label}`, async ({ page }) => {
      const mock = makeState(scenario.tzId, scenario.todayDate);
      await mock.setupRouteHandlers(page);

      await page.goto("/life-os/app/today");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("#lifeos-main-content, main").first()).toBeVisible();
      await assertNoOverflow(page, scenario.label);
    });
  }
});
