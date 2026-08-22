import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ResetPasswordScreen, type ResetPasswordScreenProps } from "./ResetPasswordScreen";

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
    instance: "/life-os/api/v1/auth/reset-password",
    code,
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [],
  });
}

function fieldValidationProblemResponse(field: string, code: string): Response {
  return jsonResponse(400, {
    type: "https://buildwithpartha.tech/life-os/problems/v1/validation-failed",
    title: "Validation failed",
    status: 400,
    detail: "Password does not meet policy.",
    instance: "/life-os/api/v1/auth/reset-password",
    code: "FIELD_VALIDATION_FAILED",
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [{ field, code }],
  });
}

function renderScreen(props: ResetPasswordScreenProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider restoreSession={false}>
        <ResetPasswordScreen {...props} />
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

async function fillMatchingPasswords(
  user: ReturnType<typeof renderWithUser>["user"],
  password = "correct-horse-battery-staple",
) {
  await user.type(screen.getByLabelText("New password"), password);
  await user.type(screen.getByLabelText("Confirm new password"), password);
}

describe("ResetPasswordScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/life-os/reset-password");
  });

  describe("Missing token state", () => {
    it("renders missing-token guidance when no token is present", () => {
      renderScreen();

      expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
      expect(screen.getByText(/A password reset link is required/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Request reset link" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/life-os/login",
      );
    });

    it("navigates to forgot-password when clicking request reset link", async () => {
      const navigate = vi.fn();
      const { user } = renderScreen({ navigate });

      await user.click(screen.getByRole("button", { name: "Request reset link" }));
      expect(navigate).toHaveBeenCalledWith("/life-os/forgot-password");
    });

    it("has no accessibility violations in missing-token state", async () => {
      const { container } = renderScreen();
      await expectNoAccessibilityViolations(container);
    });
  });

  describe("Form state (with token)", () => {
    it("renders form fields with valid token and no app shell", () => {
      renderScreen({ token: "valid-token-123" });

      expect(screen.getByRole("heading", { level: 1, name: "Set new password" })).toBeVisible();
      expect(screen.getByLabelText("New password")).toHaveAttribute("autocomplete", "new-password");
      expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
        "autocomplete",
        "new-password",
      );
      expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/life-os/login",
      );
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("reads token from URL search params if not provided in props", () => {
      window.history.replaceState({}, "", "/life-os/reset-password?token=url-token-456");
      renderScreen();

      expect(screen.getByRole("heading", { level: 1, name: "Set new password" })).toBeVisible();
    });

    it("shows inline errors and moves focus to summary on empty submit", async () => {
      const { user, container } = renderScreen({ token: "valid-token" });

      await user.click(screen.getByRole("button", { name: "Reset password" }));

      const summary = screen.getByRole("alert", {
        name: "Fix the following before continuing",
      });
      expect(summary).toHaveFocus();
      expect(summary).toHaveTextContent("Enter a new password.");
      expect(summary).toHaveTextContent("Confirm your new password.");

      await expectNoAccessibilityViolations(container);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("validates client-side password length and mismatch", async () => {
      const { user } = renderScreen({ token: "valid-token" });

      await user.type(screen.getByLabelText("New password"), "short");
      await user.type(screen.getByLabelText("Confirm new password"), "mismatch-pass");
      await user.click(screen.getByRole("button", { name: "Reset password" }));

      const summary = screen.getByRole("alert", {
        name: "Fix the following before continuing",
      });
      expect(summary).toHaveTextContent("Use at least 12 characters.");
      expect(summary).toHaveTextContent("Passwords do not match.");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("clears field error when user types in field", async () => {
      const { user } = renderScreen({ token: "valid-token" });

      await user.click(screen.getByRole("button", { name: "Reset password" }));
      expect(screen.getByLabelText("New password")).toHaveAttribute("aria-invalid", "true");

      await user.type(screen.getByLabelText("New password"), "correct-horse-battery-staple");
      expect(screen.getByLabelText("New password")).not.toHaveAttribute("aria-invalid");
    });
  });

  describe("Success state & Session Revocation", () => {
    it("transitions to success state with session revocation announcement and sign-in button", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "PASSWORD_RESET" }));
      const navigate = vi.fn();
      const { user, container } = renderScreen({ token: "valid-token", navigate });

      await fillMatchingPasswords(user);
      await user.click(screen.getByRole("button", { name: "Reset password" }));

      expect(
        await screen.findByRole("heading", { level: 1, name: "Password reset successful" }),
      ).toBeVisible();
      expect(
        screen.getByText(/all active sessions on all devices have been signed out/i),
      ).toBeInTheDocument();

      const signInBtn = screen.getByRole("button", { name: "Sign in" });
      expect(signInBtn).toBeInTheDocument();

      await user.click(signInBtn);
      expect(navigate).toHaveBeenCalledWith("/life-os/login");

      await expectNoAccessibilityViolations(container);
    });
  });

  describe("Token lifecycle error states", () => {
    it("handles expired token (TOKEN_EXPIRED / 400)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_EXPIRED"));
      const navigate = vi.fn();
      const { user, container } = renderScreen({ token: "expired-token", navigate });

      await fillMatchingPasswords(user);
      await user.click(screen.getByRole("button", { name: "Reset password" }));

      expect(
        await screen.findByRole("heading", { level: 1, name: "Reset link expired" }),
      ).toBeVisible();
      expect(screen.getByText(/expire after 1 hour for security/i)).toBeInTheDocument();

      const requestNewBtn = screen.getByRole("button", { name: "Request new reset link" });
      await user.click(requestNewBtn);
      expect(navigate).toHaveBeenCalledWith("/life-os/forgot-password");

      await expectNoAccessibilityViolations(container);
    });

    it("handles already-used token (TOKEN_ALREADY_USED / 409)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(409, "TOKEN_ALREADY_USED"));
      const navigate = vi.fn();
      const { user, container } = renderScreen({ token: "used-token", navigate });

      await fillMatchingPasswords(user);
      await user.click(screen.getByRole("button", { name: "Reset password" }));

      expect(
        await screen.findByRole("heading", { level: 1, name: "Reset link already used" }),
      ).toBeVisible();
      expect(screen.getByText(/has already been used/i)).toBeInTheDocument();

      const signInBtn = screen.getByRole("button", { name: "Sign in" });
      await user.click(signInBtn);
      expect(navigate).toHaveBeenCalledWith("/life-os/login");

      await expectNoAccessibilityViolations(container);
    });

    it("handles invalid/malformed token (TOKEN_INVALID / 400)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_INVALID"));
      const navigate = vi.fn();
      const { user, container } = renderScreen({ token: "invalid-token", navigate });

      await fillMatchingPasswords(user);
      await user.click(screen.getByRole("button", { name: "Reset password" }));

      expect(
        await screen.findByRole("heading", { level: 1, name: "Invalid reset link" }),
      ).toBeVisible();
      expect(screen.getByText(/may be broken or malformed/i)).toBeInTheDocument();

      const requestNewBtn = screen.getByRole("button", { name: "Request new reset link" });
      await user.click(requestNewBtn);
      expect(navigate).toHaveBeenCalledWith("/life-os/forgot-password");

      await expectNoAccessibilityViolations(container);
    });
  });

  describe("Password policy and server error feedback", () => {
    it("maps server-side commonly-exposed password policy violation without burning input", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        fieldValidationProblemResponse("newPassword", "COMMONLY_EXPOSED"),
      );
      const { user } = renderScreen({ token: "valid-token" });

      await fillMatchingPasswords(user, "password123456");
      await user.click(screen.getByRole("button", { name: "Reset password" }));

      const summary = await screen.findByRole("alert", {
        name: "Fix the following before continuing",
      });
      expect(summary).toHaveTextContent(
        "This password appears in known data breaches. Choose a different one.",
      );
      expect(screen.getByLabelText("New password")).toHaveValue("password123456");
    });

    it("displays rate-limit error message on 429", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(429, "RATE_LIMITED"));
      const { user } = renderScreen({ token: "valid-token" });

      await fillMatchingPasswords(user);
      await user.click(screen.getByRole("button", { name: "Reset password" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Too many attempts. Wait a few minutes before trying again.");
      expect(screen.getByLabelText("New password")).toHaveValue("correct-horse-battery-staple");
    });

    it("displays generic failure message on unexpected error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(500, "INTERNAL_ERROR"));
      const { user } = renderScreen({ token: "valid-token" });

      await fillMatchingPasswords(user);
      await user.click(screen.getByRole("button", { name: "Reset password" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "We couldn't reset your password. Your details are still here.",
      );
    });

    it("deduplicates submissions while pending", async () => {
      let resolvePromise: (res: Response) => void = () => {};
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(fetch).mockReturnValueOnce(pendingPromise);

      const { user } = renderScreen({ token: "valid-token" });
      await fillMatchingPasswords(user);

      const submitButton = screen.getByRole("button", { name: "Reset password" });
      await user.click(submitButton);

      expect(fetch).toHaveBeenCalledTimes(1);

      const form = submitButton.closest("form")!;
      fireEvent.submit(form);

      expect(fetch).toHaveBeenCalledTimes(1);

      resolvePromise(jsonResponse(200, { status: "PASSWORD_RESET" }));
    });

    it("refocuses the already mounted summary when submitted empty a second time", async () => {
      const { user } = renderScreen({ token: "valid-token" });

      await user.click(screen.getByRole("button", { name: "Reset password" }));
      const summary = screen.getByRole("alert", {
        name: "Fix the following before continuing",
      });
      expect(summary).toHaveFocus();

      screen.getByLabelText("New password").focus();
      await user.click(screen.getByRole("button", { name: "Reset password" }));
      expect(summary).toHaveFocus();
    });
  });
});
