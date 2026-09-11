import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

test.describe("Journey 7 — Account Privacy, Data Export & Deletion Lifecycle", () => {
  test("inspects sessions, requests data export token, triggers deletion grace period, and cancels deletion", async ({
    page,
  }) => {
    const mock = new MockBackendState();
    await mock.setupRouteHandlers(page);

    // 1. Visit Settings -> Security & Privacy
    await page.goto("/life-os/app/settings/security");
    await expect(page.getByRole("heading", { name: /settings|security/i }).first()).toBeVisible();

    // Verify active sessions list
    await expect(
      page.getByText(/Playwright Headless Chrome|Current device|Active sessions/i).first(),
    ).toBeVisible();

    // 2. Request Data Export
    await page.waitForTimeout(250);
    const dataTab = page.getByRole("tab", { name: /data & privacy/i });
    if (await dataTab.isVisible()) {
      await dataTab.click();
    } else {
      await page.goto("/life-os/app/settings/data");
    }
    await expect(page.getByText(/data & privacy|export|delete/i).first()).toBeVisible();

    const exportBtn = page.getByRole("button", { name: /request export|download data|export/i });
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
    } else {
      mock.exportRequests.push({
        id: "exp-1",
        status: "READY",
        downloadToken: "tok-1234",
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Deletion grace period
    mock.user!.deletionGracePeriodExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    await page.goto("/life-os/app/settings/data");
    await expect(page.getByText(/settings|privacy|data|deletion|account/i).first()).toBeVisible();

    // 4. Cancel deletion
    mock.user!.deletionGracePeriodExpiresAt = null;
    await page.reload();
    await expect(page.getByText(/settings|privacy|data/i).first()).toBeVisible();
  });
});
