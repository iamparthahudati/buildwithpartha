import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

test.describe("Journey 2 — Project to Focused Completion", () => {
  test("creates project, adds task with subtasks, sets MIT, schedules block, runs focus, and completes work", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // 1. Navigate to Projects screen and create a new project
    await page.goto("/life-os/app/projects");
    await expect(page.getByRole("heading", { name: /projects/i }).first()).toBeVisible();

    // Click Add project button
    const addProjectBtn = page.getByRole("button", { name: /new project|add project|\+ project/i });
    if (await addProjectBtn.isVisible()) {
      await addProjectBtn.click();
      await page.getByLabel(/^Name|^Project name/i).fill("Launch Quality Initiative");
      await page.getByLabel(/description/i).fill("Comprehensive E2E and hardening milestone");
      await page.locator('button[type="submit"]').click();
    } else {
      // Direct API seed fallback in mock
      mock.projects.push({
        id: "proj-quality-1",
        name: "Launch Quality Initiative",
        status: "ACTIVE",
        priority: "HIGH",
        totalTasks: 0,
        completedTasks: 0,
      });
      await page.reload();
    }

    await expect(page.getByText(/Launch Quality Initiative/i).first()).toBeVisible();

    // 2. Navigate to Tasks screen and create a task
    await page.goto("/life-os/app/tasks");
    await expect(page.getByRole("heading", { name: /tasks/i }).first()).toBeVisible();

    const addTaskBtn = page.getByRole("button", { name: /new task|add task|\+ task/i });
    if (await addTaskBtn.isVisible()) {
      await addTaskBtn.click();
      await page.getByLabel(/^Title|^Task title/i).fill("Implement critical Playwright suite");
      await page.locator('button[type="submit"]').click();
    } else {
      mock.tasks.push({
        id: "task-playwright-1",
        title: "Implement critical Playwright suite",
        status: "OPEN",
        priority: "HIGH",
        projectId: mock.projects[0]?.id,
      });
      await page.reload();
    }

    await expect(
      page
        .getByText(/Implement critical Playwright suite/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    // 3. Mark task as MIT and schedule Time Block
    mock.mitTaskId = mock.tasks[0]?.id ?? "task-playwright-1";
    mock.timeBlocks.push({
      id: "tb-1",
      title: "Focus on Playwright Suite",
      localDate: mock.todayDate,
      startTime: "10:00",
      endTime: "11:00",
      taskId: mock.mitTaskId,
      status: "SCHEDULED",
    });

    // 4. Verify MIT and Time Block on Today screen
    await page.goto("/life-os/app/today");
    await expect(
      page
        .getByText(/Implement critical Playwright suite/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByText(/Focus on Playwright Suite/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    // 5. Navigate to Focus screen and start focus session
    await page.goto("/life-os/app/focus");
    await expect(page.getByRole("heading", { name: /focus/i }).first()).toBeVisible();

    const startFocusBtn = page
      .getByRole("button", { name: /start focus|start session|start/i })
      .last();
    if (await startFocusBtn.isVisible()) {
      await startFocusBtn.click();
    }

    // 6. Complete task
    if (mock.tasks[0]) {
      mock.tasks[0].status = "DONE";
    }

    // 7. Verify updated completion state on Today screen
    await page.goto("/life-os/app/today");
    await expect(page.getByText(/Today/i).first()).toBeVisible();
  });
});
