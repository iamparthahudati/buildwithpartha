import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ForgotPasswordScreen, type ForgotPasswordScreenProps } from "./ForgotPasswordScreen";

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
    instance: "/life-os/api/v1/auth/forgot-password",
    code,
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [],
  });
}

function renderScreen(props: ForgotPasswordScreenProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <ForgotPasswordScreen {...props} />
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/life-os/forgot-password");
  });

  it("renders form elements with no app shell", () => {
    renderScreen();

    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/life-os/login");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("populates initial email from props", () => {
    renderScreen({ initialEmail: "ada@example.test" });
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.test");
  });

  it("shows an inline error and moves focus to summary on empty submit", async () => {
    const { user, container } = renderScreen();

    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const summary = screen.getByRole("alert", { name: "Fix the following before continuing" });
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("Enter your email address.");

    const emailField = screen.getByLabelText("Email");
    expect(emailField).toHaveAttribute("aria-invalid", "true");

    await expectNoAccessibilityViolations(container);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears error when user enters email", async () => {
    const { user } = renderScreen();
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("transitions to sent state on successful submission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "REQUESTED" }));
    const { user, container } = renderScreen();

    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Check your email" }),
    ).toBeVisible();
    expect(screen.getByText(/If an account matches/i)).toBeInTheDocument();
    expect(screen.getByText("ada@example.test")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("navigates to login when clicking return to sign in from sent state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "REQUESTED" }));
    const navigate = vi.fn();
    const { user } = renderScreen({ navigate });

    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const returnBtn = await screen.findByRole("button", { name: "Return to sign in" });
    await user.click(returnBtn);

    expect(navigate).toHaveBeenCalledWith("/life-os/login");
  });

  it("allows returning from sent state back to form state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "REQUESTED" }));
    const { user } = renderScreen();

    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const retryLink = await screen.findByRole("link", { name: "Enter a different address" });
    await user.click(retryLink);

    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.test");
  });

  it("shows rate-limit error message on 429", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(429, "RATE_LIMITED"));
    const { user } = renderScreen();

    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Too many attempts. Wait a few minutes before trying again.");
    await waitFor(() => expect(document.activeElement).toHaveTextContent(/Too many attempts/));
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.test");
  });

  it("shows generic failure message on 500 error without discarding input", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(500, "INTERNAL_ERROR"));
    const { user } = renderScreen();

    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn't process your request. Your details are still here.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.test");
  });

  it("deduplicates submissions while pending", async () => {
    let resolvePromise: (res: Response) => void = () => {};
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(fetch).mockReturnValueOnce(pendingPromise);

    const { user } = renderScreen();
    await user.type(screen.getByLabelText("Email"), "ada@example.test");

    const submitButton = screen.getByRole("button", { name: "Send reset link" });
    await user.click(submitButton);

    expect(fetch).toHaveBeenCalledTimes(1);

    const form = submitButton.closest("form")!;
    fireEvent.submit(form);

    expect(fetch).toHaveBeenCalledTimes(1);

    resolvePromise(jsonResponse(202, { status: "REQUESTED" }));
  });

  it("refocuses the already mounted summary when submitted empty a second time", async () => {
    const { user } = renderScreen();

    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    const summary = screen.getByRole("alert", { name: "Fix the following before continuing" });
    expect(summary).toHaveFocus();

    screen.getByLabelText("Email").focus();
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(summary).toHaveFocus();
  });

  it("maps server validation failure to approved copy and focuses summary", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(400, {
        type: "https://buildwithpartha.tech/life-os/problems/v1/validation-failed",
        title: "Validation failed",
        status: 400,
        detail: "One or more fields are invalid.",
        instance: "/life-os/api/v1/auth/forgot-password",
        code: "VALIDATION_FAILED",
        correlationId: "11111111-1111-4111-8111-111111111111",
        errors: [{ field: "email", code: "Email" }],
      }),
    );
    const { user } = renderScreen();

    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const summary = await screen.findByRole("alert", {
      name: "Fix the following before continuing",
    });
    expect(summary).toHaveTextContent("Enter an email address in the format name@example.com.");
    expect(summary).toHaveFocus();
  });

  it("has no accessibility violations in default form state", async () => {
    const { container } = renderScreen();
    await expectNoAccessibilityViolations(container);
  });
});
