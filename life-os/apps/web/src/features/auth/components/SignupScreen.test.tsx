import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { SignupScreen } from "./SignupScreen";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function problemResponse(status: number, code: string): Response {
  return jsonResponse(status, {
    type: "https://buildwithpartha.tech/life-os/problems/v1/example",
    title: "Example failure",
    status,
    detail: "Example detail.",
    instance: "/life-os/api/v1/auth/signup",
    code,
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [],
  });
}

function validationFailureResponse(): Response {
  return jsonResponse(400, {
    type: "https://buildwithpartha.tech/life-os/problems/v1/validation-failed",
    title: "Validation failed",
    status: 400,
    detail: "One or more fields are invalid.",
    instance: "/life-os/api/v1/auth/signup",
    code: "VALIDATION_FAILED",
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [{ field: "password", code: "COMMONLY_EXPOSED" }],
  });
}

function renderScreen() {
  const queryClient = new QueryClient();
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <SignupScreen />
    </QueryClientProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof renderWithUser>["user"]) {
  await user.type(screen.getByLabelText("Your name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.test");
  await user.type(screen.getByLabelText("Password"), "correct-horse-battery-staple");
  await user.click(
    screen.getByRole("checkbox", { name: "I agree to the Terms of Service and Privacy Policy" }),
  );
}

describe("SignupScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders every field the ticket names, with no app shell", () => {
    renderScreen();

    expect(screen.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(
      screen.getByRole("checkbox", { name: "I agree to the Terms of Service and Privacy Policy" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("links to the Terms of Service and Privacy Policy", () => {
    renderScreen();

    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/life-os/terms",
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/life-os/privacy",
    );
  });

  it("shows an inline error and a linked summary on an empty submit, and moves focus to the summary", async () => {
    const { user, container } = renderScreen();

    await user.click(screen.getByRole("button", { name: "Create account" }));

    const summary = screen.getByRole("alert", { name: "Fix the following before continuing" });
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("Enter your name.");
    expect(summary).toHaveTextContent("Enter your email address.");
    expect(summary).toHaveTextContent("Enter a password.");
    expect(summary).toHaveTextContent("Accept the terms and privacy notice to continue.");

    const emailField = screen.getByLabelText("Email");
    expect(emailField).toHaveAttribute("aria-invalid", "true");

    await expectNoAccessibilityViolations(container);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears a field's error the moment it is corrected", async () => {
    const { user } = renderScreen();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText("Email"), "ada@example.test");

    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("shows the same neutral pending state on a successful submit", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Check your email" }),
    ).toBeVisible();
    expect(screen.getByText(/ada@example\.test/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      email: "ada@example.test",
      displayName: "Ada Lovelace",
      termsVersion: "2026-08-01",
      privacyVersion: "2026-08-01",
    });
  });

  it("shows the identical pending state for an email that already has an account", async () => {
    // The backend response for a duplicate is byte-for-byte the same
    // PENDING_VERIFICATION body; nothing in this component may branch on it.
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Check your email" }),
    ).toBeVisible();
  });

  it("maps a server-reported field failure to approved copy and focuses the summary", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(validationFailureResponse());
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const summary = await screen.findByRole("alert", {
      name: "Fix the following before continuing",
    });
    expect(summary).toHaveTextContent("This password appears in known data breaches.");
    expect(summary).toHaveFocus();
  });

  it("shows a rate-limit message without discarding the entered values", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(429, "RATE_LIMITED"));
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await screen.findByText("Too many attempts. Wait a few minutes before trying again.");
    await waitFor(() => expect(document.activeElement).toHaveTextContent(/Too many attempts/));
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.test");
    expect(screen.getByLabelText("Your name")).toHaveValue("Ada Lovelace");
  });

  it("shows a generic failure message for an unexpected error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(500, "INTERNAL_ERROR"));
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("We couldn't create your account. Your details are still here."),
    ).toBeVisible();
  });

  it("has no accessibility violations in the default state", async () => {
    const { container } = renderScreen();
    await expectNoAccessibilityViolations(container);
  });
});
