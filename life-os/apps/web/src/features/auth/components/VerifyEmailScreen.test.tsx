import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { VerifyEmailScreen, type VerifyEmailScreenProps } from "./VerifyEmailScreen";

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
    instance: "/life-os/api/v1/auth/verify-email",
    code,
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [],
  });
}

function renderScreen(props: VerifyEmailScreenProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <VerifyEmailScreen {...props} />
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

describe("VerifyEmailScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/life-os/verify-email");
  });

  describe("verifying & token outcomes", () => {
    it("renders the verifying state when a token is present and auto-triggers verification", async () => {
      let resolveFetch: (res: Response) => void = () => {};
      const pendingFetch = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
      vi.mocked(fetch).mockReturnValueOnce(pendingFetch);

      renderScreen({ token: "sample-token-123" });

      expect(screen.getByRole("heading", { level: 1, name: "Verifying your email" })).toBeVisible();
      expect(screen.getByText("Please wait while we verify your email address.")).toBeVisible();

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/life-os/api/v1/auth/verify-email");
      expect(JSON.parse(init.body as string)).toEqual({ token: "sample-token-123" });

      resolveFetch(jsonResponse(200, { status: "VERIFIED" }));
    });

    it("reads token from URL search params when prop is omitted", async () => {
      window.history.replaceState({}, "", "/life-os/verify-email?token=url-token-456");
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "VERIFIED" }));

      renderScreen();

      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 1, name: "Email verified" })).toBeVisible(),
      );

      const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/life-os/api/v1/auth/verify-email");
      expect(JSON.parse(init.body as string)).toEqual({ token: "url-token-456" });
    });

    it("displays verified state on success and navigates to sign in", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "VERIFIED" }));
      const navigate = vi.fn();

      const { user, container } = renderScreen({ token: "valid-token", navigate });

      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 1, name: "Email verified" })).toBeVisible(),
      );

      expect(
        screen.getByText(
          "Your email address has been verified. You can now sign in to your LifeOS account.",
        ),
      ).toBeVisible();

      const signInButton = screen.getByRole("button", { name: "Sign in" });
      await user.click(signInButton);

      expect(navigate).toHaveBeenCalledWith("/life-os/login");
      await expectNoAccessibilityViolations(container);
    });

    it("displays expired state on TOKEN_EXPIRED and allows resending if email is known", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_EXPIRED"));

      const { user, container } = renderScreen({
        token: "expired-token",
        initialEmail: "user@example.test",
        initialCooldownSeconds: 0,
      });

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { level: 1, name: "Verification link expired" }),
        ).toBeVisible(),
      );

      expect(
        screen.getByText(
          "This verification link has expired. Verification links expire after 24 hours for security.",
        ),
      ).toBeVisible();

      // Can resend directly for the known email
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));

      const resendButton = screen.getByRole("button", { name: "Resend verification link" });
      await user.click(resendButton);

      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible(),
      );

      await expectNoAccessibilityViolations(container);
    });

    it("displays invalid state on TOKEN_INVALID and allows requesting a new link", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_INVALID"));

      const { user, container } = renderScreen({ token: "broken-token" });

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { level: 1, name: "Invalid verification link" }),
        ).toBeVisible(),
      );

      expect(
        screen.getByText(
          /We couldn’t verify your email with this link. It may be broken or malformed./,
        ),
      ).toBeVisible();

      const requestButton = screen.getByRole("button", {
        name: "Request new verification link",
      });
      await user.click(requestButton);

      expect(
        screen.getByRole("heading", { level: 1, name: "Resend verification email" }),
      ).toBeVisible();

      await expectNoAccessibilityViolations(container);
    });

    it("displays already-used state on TOKEN_ALREADY_USED (HTTP 409) with sign in action", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(409, "TOKEN_ALREADY_USED"));
      const navigate = vi.fn();

      const { user, container } = renderScreen({ token: "used-token", navigate });

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { level: 1, name: "Verification link already used" }),
        ).toBeVisible(),
      );

      expect(
        screen.getByText(
          /This verification link has already been used to activate an account. If your account is verified, you can sign in directly./,
        ),
      ).toBeVisible();

      await user.click(screen.getByRole("button", { name: "Sign in" }));
      expect(navigate).toHaveBeenCalledWith("/life-os/login");

      await expectNoAccessibilityViolations(container);
    });

    it("shows rate limit alert if verification request returns 429", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(429, "RATE_LIMITED"));

      renderScreen({ token: "rate-limited-token" });

      await screen.findByText("Too many attempts. Wait a few minutes before trying again.");
      await waitFor(() => expect(document.activeElement).toHaveTextContent(/Too many attempts/));
    });

    it("shows generic failure alert on unexpected verification error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(500, "INTERNAL_ERROR"));

      renderScreen({ token: "error-token" });

      await screen.findByText("We couldn't verify your email. Please try again.");
    });
  });

  describe("sent state & cooldown timer", () => {
    it("renders sent state when initialEmail is provided without token", () => {
      renderScreen({ initialEmail: "user@example.test", initialCooldownSeconds: 45 });

      expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();
      expect(
        screen.getByText(/We’ve sent verification instructions to user@example.test./),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "Resend email (45s)" })).toBeDisabled();
    });

    it("counts down cooldown timer and enables resend button when expired", async () => {
      vi.useFakeTimers();

      renderScreen({ initialEmail: "user@example.test", initialCooldownSeconds: 2 });

      expect(screen.getByRole("button", { name: "Resend email (2s)" })).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole("button", { name: "Resend email (1s)" })).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole("button", { name: "Resend email" })).toBeEnabled();

      vi.useRealTimers();
    });

    it("allows resending once cooldown has expired", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));

      const { user } = renderScreen({
        initialEmail: "user@example.test",
        initialCooldownSeconds: 0,
      });

      const resendButton = screen.getByRole("button", { name: "Resend email" });
      expect(resendButton).toBeEnabled();

      await user.click(resendButton);

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/life-os/api/v1/auth/resend-verification");
      expect(JSON.parse(init.body as string)).toEqual({ email: "user@example.test" });

      expect(screen.getByRole("button", { name: /Resend email \(\d+s\)/ })).toBeDisabled();
    });

    it("switches to request state when user clicks 'Enter a different address'", async () => {
      const { user } = renderScreen({ initialEmail: "wrong@example.test" });

      await user.click(screen.getByRole("link", { name: "Enter a different address" }));

      expect(
        screen.getByRole("heading", { level: 1, name: "Resend verification email" }),
      ).toBeVisible();
    });
  });

  describe("request state & resend form validation", () => {
    it("renders the resend form when no token or email is present", () => {
      renderScreen();

      expect(
        screen.getByRole("heading", { level: 1, name: "Resend verification email" }),
      ).toBeVisible();
      expect(screen.getByLabelText("Email")).toBeVisible();
      expect(screen.getByRole("button", { name: "Send verification link" })).toBeVisible();
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/life-os/login",
      );
    });

    it("validates empty email field and focuses the summary", async () => {
      const { user, container } = renderScreen();

      await user.click(screen.getByRole("button", { name: "Send verification link" }));

      const summary = screen.getByRole("alert", {
        name: "Fix the following before continuing",
      });
      expect(summary).toHaveFocus();
      expect(summary).toHaveTextContent("Enter your email address.");
      expect(fetch).not.toHaveBeenCalled();

      await expectNoAccessibilityViolations(container);
    });

    it("validates invalid email format", async () => {
      const { user } = renderScreen();

      await user.type(screen.getByLabelText("Email"), "notanemail");
      await user.click(screen.getByRole("button", { name: "Send verification link" }));

      const summary = screen.getByRole("alert", {
        name: "Fix the following before continuing",
      });
      expect(summary).toHaveTextContent("Enter a valid email address.");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("successfully submits resend request and transitions to sent state with cooldown", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));

      const { user } = renderScreen();

      await user.type(screen.getByLabelText("Email"), "newuser@example.test");
      await user.click(screen.getByRole("button", { name: "Send verification link" }));

      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible(),
      );

      expect(
        screen.getByText(/We’ve sent verification instructions to newuser@example.test./),
      ).toBeVisible();
    });

    it("shows rate limit error on 429 response when requesting resend", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(429, "RATE_LIMITED"));

      const { user } = renderScreen();

      await user.type(screen.getByLabelText("Email"), "limited@example.test");
      await user.click(screen.getByRole("button", { name: "Send verification link" }));

      await screen.findByText("Too many attempts. Wait a few minutes before trying again.");
      await waitFor(() => expect(document.activeElement).toHaveTextContent(/Too many attempts/));
    });

    it("shows generic failure alert on unexpected resend error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(500, "INTERNAL_ERROR"));

      const { user } = renderScreen();

      await user.type(screen.getByLabelText("Email"), "error@example.test");
      await user.click(screen.getByRole("button", { name: "Send verification link" }));

      await screen.findByText("We couldn't send the verification email. Please try again.");
    });

    it("displays expired state without email and allows switching to request state", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_EXPIRED"));

      const { user } = renderScreen({
        token: "expired-token",
        initialCooldownSeconds: 0,
      });

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { level: 1, name: "Verification link expired" }),
        ).toBeVisible(),
      );

      const requestButton = screen.getByRole("button", {
        name: "Request new verification link",
      });
      await user.click(requestButton);

      expect(
        screen.getByRole("heading", { level: 1, name: "Resend verification email" }),
      ).toBeVisible();
    });

    it("allows clicking 'Use different email' in expired state", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_EXPIRED"));

      const { user } = renderScreen({
        token: "expired-token",
        initialEmail: "old@example.test",
      });

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { level: 1, name: "Verification link expired" }),
        ).toBeVisible(),
      );

      const diffEmailButton = screen.getByRole("button", { name: "Use different email" });
      await user.click(diffEmailButton);

      expect(
        screen.getByRole("heading", { level: 1, name: "Resend verification email" }),
      ).toBeVisible();
    });

    it("allows clicking 'Request new link' from already-used state", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(409, "TOKEN_ALREADY_USED"));

      const { user } = renderScreen({ token: "used-token" });

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { level: 1, name: "Verification link already used" }),
        ).toBeVisible(),
      );

      const requestNewLinkButton = screen.getByRole("button", { name: "Request new link" });
      await user.click(requestNewLinkButton);

      expect(
        screen.getByRole("heading", { level: 1, name: "Resend verification email" }),
      ).toBeVisible();
    });

    it("shows rate limit error on resend for known email", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(429, "RATE_LIMITED"));

      const { user } = renderScreen({
        initialEmail: "known@example.test",
        initialCooldownSeconds: 0,
      });

      await user.click(screen.getByRole("button", { name: "Resend email" }));

      await screen.findByText("Too many attempts. Wait a few minutes before trying again.");
    });

    it("shows generic failure on unexpected error during resend for known email", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(problemResponse(500, "INTERNAL_ERROR"));

      const { user } = renderScreen({
        initialEmail: "known@example.test",
        initialCooldownSeconds: 0,
      });

      await user.click(screen.getByRole("button", { name: "Resend email" }));

      await screen.findByText("We couldn't send the verification email. Please try again.");
    });

    it("clears email field error on input change in resend form", async () => {
      const { user } = renderScreen();

      await user.click(screen.getByRole("button", { name: "Send verification link" }));

      expect(screen.getAllByText("Enter your email address.")).toHaveLength(2);
      expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");

      await user.type(screen.getByLabelText("Email"), "a");

      expect(screen.queryByText("Enter your email address.")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    });
  });
});
