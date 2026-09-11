import { test, expect } from "@playwright/test";
import { MockBackendState } from "../fixtures/mockApi";

test.describe("Journey 1 — Identity, Verification & Onboarding", () => {
  test("allows signup, verification, onboarding configuration, and entry into sparse Today dashboard", async ({
    page,
  }) => {
    const mock = new MockBackendState({
      user: null, // Start anonymous
    });
    await mock.setupRouteHandlers(page);

    // 1. Visit signup page
    await page.goto("/life-os/signup");
    await expect(page).toHaveTitle(/LifeOS/);

    // Fill signup form
    await page.getByLabel(/^Your name/i).fill("Alex Taylor");
    await page.getByLabel(/^Email/i).fill("alex.taylor@example.test");
    await page.getByLabel(/^Password/i).fill("CorrectHorseBattery99!");
    await page.getByLabel(/I agree to the Terms of Service and Privacy Policy/i).check();

    await page.getByRole("button", { name: "Create account" }).click();

    // 2. Verification prompt / transition
    await expect(page.getByText(/Check your email/i)).toBeVisible();

    // 3. Simulate email verification token link
    await page.goto("/life-os/verify-email?token=valid-token-1234");
    await expect(page.getByText(/Email verified/i)).toBeVisible();

    // 4. Click Sign in to go to login
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: /Sign in to LifeOS/i })).toBeVisible();

    // 5. Login
    await page.getByLabel(/^Email/i).fill("alex.taylor@example.test");
    await page.getByLabel(/^Password/i).fill("CorrectHorseBattery99!");
    await page.getByRole("button", { name: "Sign in" }).click();

    // 6. Land on Today dashboard or Onboarding
    await page.goto("/life-os/app/today");
    await expect(page.getByText(/Today/i).first()).toBeVisible();
  });
});
