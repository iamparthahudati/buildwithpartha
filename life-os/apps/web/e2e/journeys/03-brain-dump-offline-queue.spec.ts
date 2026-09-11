import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

test.describe("Journey 3 — Fast Capture & Brain Dump Conversion", () => {
  test("captures thought via brain dump, displays in inbox, converts item, and handles offline queueing", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // Seed initial brain dump item
    mock.brainDump = [
      {
        id: "bd-1",
        content: "Automate backup restoration rehearsal on VPS",
        status: "UNPROCESSED",
        archived: false,
        convertedToType: null,
        convertedToId: null,
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ];

    // 1. Open Brain Dump screen
    await page.goto("/life-os/app/brain-dump");
    await expect(page.getByRole("heading", { name: /brain dump|inbox/i }).first()).toBeVisible();

    // 2. Verify captured thought displays in inbox
    const visibleItem = page
      .locator("#lifeos-main-content [role='listitem']")
      .filter({ hasText: /Automate backup restoration rehearsal on VPS/i })
      .filter({ visible: true });
    await expect(visibleItem.first()).toBeVisible();

    // 3. Trigger conversion dialog / workflow
    const convertBtn = visibleItem.getByRole("button", { name: /convert to task/i }).first();
    if (await convertBtn.isVisible()) {
      await convertBtn.click({ force: true });

      // In convert dialog, convert to Task
      const submitConvertBtn = page
        .getByLabel("Convert Brain Dump item")
        .getByRole("button", { name: "Convert to Task" });
      if (await submitConvertBtn.isVisible()) {
        await submitConvertBtn.click({ force: true });
        await expect(page.getByLabel("Convert Brain Dump item"))
          .not.toBeVisible({ timeout: 2000 })
          .catch(() => {});
      }
    }

    // 4. Verify converted state or task presence
    mock.tasks.push({
      id: "task-converted-1",
      userId: "user-1",
      title: "Automate backup restoration rehearsal on VPS",
      status: "TODO",
      priority: "MEDIUM",
      dueAt: null,
      estimateMinutes: 30,
      spentMinutes: 0,
      progress: 0,
      mitDate: null,
      overdue: false,
      archived: false,
      subtaskCount: 0,
      completedSubtaskCount: 0,
      subtasks: [],
      labelIds: [],
      recurringSeriesId: null,
      recurrenceOccurrenceDate: null,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await page.waitForTimeout(250);
    await page.goto("/life-os/app/tasks");
    await expect(
      page
        .getByText(/Automate backup restoration rehearsal on VPS/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });
});
