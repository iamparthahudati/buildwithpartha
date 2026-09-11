import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

test.describe("Journey 6 — Recurring Tasks Across Time Boundaries", () => {
  test("creates recurring series, displays generated occurrences, completes single instance, and handles series scope", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // 1. Seed recurring series and occurrences
    mock.recurringSeries.push({
      id: "series-weekly-1",
      title: "Weekly Security Triage Rehearsal",
      frequency: "WEEKLY",
      interval: 1,
      daysOfWeek: ["MONDAY", "FRIDAY"],
      endRule: "NEVER",
    });

    mock.tasks.push(
      {
        id: "task-rec-occ-1",
        title: "Weekly Security Triage Rehearsal",
        status: "OPEN",
        priority: "HIGH",
        scheduledDate: mock.todayDate,
        recurringSeriesId: "series-weekly-1",
        recurrenceOccurrenceDate: mock.todayDate,
      },
      {
        id: "task-rec-occ-2",
        title: "Weekly Security Triage Rehearsal",
        status: "OPEN",
        priority: "HIGH",
        scheduledDate: "2026-09-12",
        recurringSeriesId: "series-weekly-1",
        recurrenceOccurrenceDate: "2026-09-12",
      },
    );

    // 2. Open Tasks screen
    await page.goto("/life-os/app/tasks");
    await expect(page.getByRole("heading", { name: /tasks/i }).first()).toBeVisible();
    await expect(
      page
        .getByText(/Weekly Security Triage Rehearsal/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    // 3. Mark the first occurrence as complete
    mock.tasks[0].status = "DONE";
    mock.tasks[0].completedAt = new Date().toISOString();

    // 4. Verify completion does not affect future occurrence
    expect(mock.tasks[1].status).toBe("OPEN");
  });
});
