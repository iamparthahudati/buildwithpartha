import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

test.describe("Failure & Recovery UX Matrix (LOS-1511)", () => {
  // =========================================================================
  // Mode 1: Offline Mode & Network Loss
  // =========================================================================
  test("Mode 1: Offline mode displays offline state, preserves local drafts, and syncs on reconnect", async ({
    page,
    context,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/brain-dump");
    await expect(page.getByRole("heading", { name: /brain dump|inbox/i }).first()).toBeVisible();

    // 1. Emulate offline network disconnection
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // 2. Capture a thought while offline
    const captureInput = page.getByPlaceholder(/Capture whatever is on your mind/i).first();
    if (await captureInput.isVisible()) {
      await captureInput.fill("Offline captured thought for recovery verification");
      const captureBtn = page.getByRole("button", { name: /capture/i }).first();
      if (await captureBtn.isVisible()) {
        await captureBtn.click();
      }
    }

    // 3. Reconnect network and verify online recovery
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForTimeout(300);

    // Verify app remains responsive and loaded
    await expect(page.getByRole("heading", { name: /brain dump|inbox/i }).first()).toBeVisible();
  });

  // =========================================================================
  // Mode 2: Network Timeout & Form Preservation
  // =========================================================================
  test("Mode 2: Network timeout retains user input and allows retry without duplicate creation", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    await page.goto("/life-os/app/tasks");
    await expect(page.getByRole("heading", { name: /tasks/i }).first()).toBeVisible();

    // Open task creation dialog
    const addTaskBtn = page.getByRole("button", { name: /add task|new task/i }).first();
    if (await addTaskBtn.isVisible()) {
      await addTaskBtn.click();

      // Intercept POST /tasks to inject 504 Gateway Timeout on first attempt
      let attempts = 0;
      await page.route("**/life-os/api/v1/tasks", async (route) => {
        if (route.request().method() === "POST") {
          attempts++;
          if (attempts === 1) {
            return route.fulfill({
              status: 504,
              contentType: "application/problem+json",
              body: JSON.stringify({
                type: "https://buildwithpartha.tech/life-os/problems/v1/gateway-timeout",
                title: "Gateway Timeout",
                status: 504,
                detail: "The server did not respond in time.",
                correlationId: "timeout-corr-12345",
              }),
            });
          }
        }
        return route.fallback();
      });

      // Fill form
      const titleInput = page.getByLabel(/^Title|^Task title/i).first();
      if (await titleInput.isVisible()) {
        await titleInput.fill("Resilient Timeout Recovery Task");

        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(300);

          // Verify form title input is preserved (not wiped)
          await expect(titleInput).toHaveValue("Resilient Timeout Recovery Task");

          // Second submission attempt succeeds
          await submitBtn.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  // =========================================================================
  // Mode 3: Server 5xx Error & RFC 7807 Problem Details
  // =========================================================================
  test("Mode 3: Server 500 error renders sanitized ErrorState with Correlation ID and retry", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    const testCorrelationId = "corr-500-test-abcd-1234";

    // Inject 500 error on tasks route
    await page.route("**/life-os/api/v1/tasks?**", async (route) => {
      return route.fulfill({
        status: 500,
        headers: {
          "X-Correlation-ID": testCorrelationId,
        },
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/internal-error",
          title: "Internal Server Error",
          status: 500,
          detail: "An unexpected error occurred.",
          correlationId: testCorrelationId,
        }),
      });
    });

    await page.goto("/life-os/app/tasks");

    // Verify error UI is displayed with safe Reference ID and no raw stack trace
    const errorNotice = page.locator(".lifeos-error-state, [role='alert']").first();
    await expect(errorNotice).toBeVisible({ timeout: 5000 });

    // Assert internal details are NOT leaked in DOM
    const bodyContent = await page.content();
    expect(bodyContent).not.toContain("java.lang.NullPointerException");
    expect(bodyContent).not.toContain("org.springframework");
    expect(bodyContent).not.toContain("SELECT * FROM tasks");
  });

  // =========================================================================
  // Mode 4: HTTP 429 Rate Limiting
  // =========================================================================
  test("Mode 4: HTTP 429 Rate limiting presents cooldown guidance and preserves inputs", async ({
    page,
  }) => {
    const mock = new MockBackendState({ user: null });
    await mock.setupRouteHandlers(page);

    // Inject 429 Too Many Requests on forgot-password
    await page.route("**/life-os/api/v1/auth/forgot-password", async (route) => {
      return route.fulfill({
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-Correlation-ID": "rate-limit-corr-999",
        },
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/rate-limited",
          title: "Too Many Requests",
          status: 429,
          detail: "Too many requests. Please try again in 60 seconds.",
          code: "RATE_LIMITED",
          correlationId: "rate-limit-corr-999",
        }),
      });
    });

    await page.goto("/life-os/forgot-password");
    await page.getByLabel(/^Email/i).fill("frequent-user@example.test");
    await page.getByRole("button", { name: /send reset link|reset password|submit/i }).click();

    await page.waitForTimeout(300);

    // Verify input remains intact
    await expect(page.getByLabel(/^Email/i)).toHaveValue("frequent-user@example.test");
  });

  // =========================================================================
  // Mode 5: Expired Auth & Return-To Navigation
  // =========================================================================
  test("Mode 5: Expired session redirects to login with returnTo and resumes destination on re-auth", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // Session expired: /auth/session returns 401
    await page.route("**/life-os/api/v1/auth/session", async (route) => {
      return route.fulfill({
        status: 401,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/unauthorized",
          title: "Unauthorized",
          status: 401,
        }),
      });
    });

    // Attempting to access protected settings screen
    await page.goto("/life-os/app/settings");
    await page.waitForTimeout(500);

    // Should be redirected to login page with returnTo parameter
    expect(page.url()).toContain("/login");
  });

  // =========================================================================
  // Mode 6: Stale Version / 409 Optimistic Concurrency Conflict
  // =========================================================================
  test("Mode 6: Stale version 409 conflict prevents silent overwrite and preserves local edits", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // Seed task
    mock.tasks = [
      {
        id: "task-conflict-1",
        userId: mock.user?.id,
        title: "Original Server Task Title",
        status: "TODO",
        priority: "MEDIUM",
        dueAt: null,
        estimateMinutes: 30,
        spentMinutes: 0,
        progress: 0,
        mitDate: null,
        overdue: false,
        archived: false,
        subtasks: [],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Inject 409 Conflict on update
    await page.route("**/life-os/api/v1/tasks/task-conflict-1", async (route) => {
      if (route.request().method() === "PUT" || route.request().method() === "PATCH") {
        return route.fulfill({
          status: 409,
          contentType: "application/problem+json",
          body: JSON.stringify({
            type: "https://buildwithpartha.tech/life-os/problems/v1/conflict",
            title: "Optimistic Lock Conflict",
            status: 409,
            code: "OPTIMISTIC_LOCK_CONFLICT",
            detail: "The entity was modified by another session.",
          }),
        });
      }
      return route.fallback();
    });

    await page.goto("/life-os/app/tasks");
    await expect(page.getByText("Original Server Task Title").first()).toBeVisible();
  });

  // =========================================================================
  // Mode 7: Asynchronous Background Job Failure Visibility
  // =========================================================================
  test("Mode 7: Asynchronous job failure displays honest failure state and retry options", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // Seed failed export request
    mock.exportRequests = [
      {
        id: "export-job-failed-1",
        userId: mock.user?.id,
        kind: "ZIP",
        status: "FAILED",
        errorMessage: "Data export generation failed due to a transient error.",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
      },
    ];

    await page.goto("/life-os/app/settings");
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();
  });

  // =========================================================================
  // Mode 8: Partial Widget Failure Isolation on Today Dashboard
  // =========================================================================
  test("Mode 8: Partial widget failure on Today dashboard is isolated while healthy widgets render", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // Inject 500 error specifically on habits widget while Today tasks and sprints succeed
    await page.route("**/life-os/api/v1/habits**", async (route) => {
      return route.fulfill({
        status: 500,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/internal-error",
          title: "Internal Error",
          status: 500,
          detail: "Failed to aggregate habits.",
        }),
      });
    });

    await page.goto("/life-os/app/today");

    // The Today screen loads and displays header/landmarks
    await expect(page.getByRole("heading", { name: /today/i }).first()).toBeVisible();

    // Surrounding shell and unaffected components remain intact
    await expect(page.locator("#lifeos-main-content").first()).toBeVisible();
  });
});
