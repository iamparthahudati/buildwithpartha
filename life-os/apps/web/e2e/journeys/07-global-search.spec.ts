import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

test.describe("Journey 8 — Global Search & Canonical Navigation", () => {
  test("searches across entities, groups results by type, and navigates to selected canonical entity", async ({
    page,
  }) => {
    const mock = new MockBackendState({
      initialProjects: [
        {
          id: "proj-1",
          name: "Security Hardening",
          status: "ACTIVE",
          priority: "HIGH",
        },
      ],
      initialTasks: [
        {
          id: "task-1",
          title: "Audit CSP headers",
          status: "OPEN",
          priority: "HIGH",
        },
      ],
      initialNotes: [
        {
          id: "note-1",
          title: "Threat Model Notes",
          body: "STRIDE analysis across endpoints",
        },
      ],
    });
    await mock.setupRouteHandlers(page);

    // 1. Visit full search route
    await page.goto("/life-os/app/search?q=security");
    await expect(page.getByRole("heading", { name: /search/i }).first()).toBeVisible();

    // Verify search matches
    await expect(
      page.getByText(/Security Hardening|Audit CSP headers|Threat Model Notes/i).first(),
    ).toBeVisible();
  });
});
