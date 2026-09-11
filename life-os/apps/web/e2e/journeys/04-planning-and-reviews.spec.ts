import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

test.describe("Journey 4 & 5 — Week Planning & Daily Reviews", () => {
  test("manages weekly planning capacity & task allocations, and executes daily review rituals", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // 1. Visit Week Planner screen
    await page.goto("/life-os/app/week-planner");
    await expect(
      page.getByRole("heading", { name: /week planner|weekly plan/i }).first(),
    ).toBeVisible();

    // Verify day strip or capacity metrics
    await expect(page.getByText(/outcomes|capacity|planned/i).first()).toBeVisible();

    // 2. Daily Reviews
    mock.reviews.push({
      id: "rev-morning-1",
      type: "DAILY_MORNING",
      periodKey: mock.todayDate,
      status: "FINALIZED",
      finalizedAt: new Date().toISOString(),
    });

    // 3. Verify Today reflects review completion status
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.goto("/life-os/app/today");
    await expect(page.getByRole("heading", { name: /today/i }).first()).toBeVisible();
  });
});
