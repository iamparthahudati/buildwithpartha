import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { LoginScreen, type LoginScreenProps } from "./LoginScreen";

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
    instance: "/life-os/api/v1/auth/login",
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
    instance: "/life-os/api/v1/auth/login",
    code: "VALIDATION_FAILED",
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [{ field: "email", code: "Email" }],
  });
}

const mockLoginSuccessResponse = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "ada@example.test",
  displayName: "Ada Lovelace",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
  csrfToken: "bootstrap-csrf-token",
};

function renderScreen(props: LoginScreenProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <LoginScreen {...props} />
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof renderWithUser>["user"]) {
  await user.type(screen.getByLabelText("Email"), "ada@example.test");
  await user.type(screen.getByLabelText("Password"), "correct-horse-battery-staple");
}

describe("LoginScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/life-os/login");
  });

  it("renders every field the ticket names, with no app shell", () => {
    renderScreen();

    expect(screen.getByRole("heading", { level: 1, name: "Sign in to LifeOS" })).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("links to the forgot-password and signup routes", () => {
    renderScreen();

    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/life-os/forgot-password",
    );
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/life-os/signup",
    );
  });

  it("shows an inline error and a linked summary on an empty submit, and moves focus to the summary", async () => {
    const { user, container } = renderScreen();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const summary = screen.getByRole("alert", { name: "Fix the following before continuing" });
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("Enter your email address.");
    expect(summary).toHaveTextContent("Enter your password.");

    const emailField = screen.getByLabelText("Email");
    expect(emailField).toHaveAttribute("aria-invalid", "true");

    await expectNoAccessibilityViolations(container);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refocuses the already mounted summary when submitted empty a second time", async () => {
    const { user } = renderScreen();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const summary = screen.getByRole("alert", { name: "Fix the following before continuing" });
    expect(summary).toHaveFocus();

    // Blur summary and click submit again while summary node is already mounted
    screen.getByLabelText("Email").focus();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(summary).toHaveFocus();
  });

  it("clears a field's error the moment it is edited", async () => {
    const { user } = renderScreen();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText("Email"), "ada@example.test");

    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("navigates to default Today path on successful login when returnTo is absent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockLoginSuccessResponse));
    const navigate = vi.fn();
    const { user } = renderScreen({ navigate });

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/life-os/app/today"));

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      email: "ada@example.test",
      password: "correct-horse-battery-staple",
    });
  });

  it("navigates to validated returnTo destination on successful login", async () => {
    window.history.replaceState({}, "", "/life-os/login?returnTo=%2Flife-os%2Fapp%2Ftasks");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockLoginSuccessResponse));
    const navigate = vi.fn();
    const { user } = renderScreen({ navigate });

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/life-os/app/tasks"));
  });

  it("falls back to Today destination when returnTo is an open-redirect exploit", async () => {
    window.history.replaceState({}, "", "/life-os/login?returnTo=https%3A%2F%2Fevil.example");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockLoginSuccessResponse));
    const navigate = vi.fn();
    const { user } = renderScreen({ navigate });

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/life-os/app/today"));
  });

  it("shows generic invalid credentials error and moves focus to alert", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(401, "INVALID_CREDENTIALS"));
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email or password is incorrect.");
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent("Email or password is incorrect."),
    );
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.test");
  });

  it("maps server validation failure to approved copy and focuses the summary", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(validationFailureResponse());
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const summary = await screen.findByRole("alert", {
      name: "Fix the following before continuing",
    });
    expect(summary).toHaveTextContent("Enter an email address in the format name@example.com.");
    expect(summary).toHaveFocus();
  });

  it("shows rate-limit message without discarding entered credentials", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(429, "RATE_LIMITED"));
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByText("Too many attempts. Wait a few minutes before trying again.");
    await waitFor(() => expect(document.activeElement).toHaveTextContent(/Too many attempts/));
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.test");
  });

  it("shows a generic failure message for an unexpected error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(500, "INTERNAL_ERROR"));
    const { user } = renderScreen();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("We couldn't sign you in. Your details are still here."),
    ).toBeVisible();
  });

  it("deduplicates submissions when a request is already pending", async () => {
    let resolvePromise: (res: Response) => void = () => {};
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(fetch).mockReturnValueOnce(pendingPromise);

    const { user } = renderScreen();
    await fillValidForm(user);

    const submitButton = screen.getByRole("button", { name: "Sign in" });
    await user.click(submitButton);

    expect(fetch).toHaveBeenCalledTimes(1);

    // Attempt second submission while pending via form event
    const form = submitButton.closest("form")!;
    fireEvent.submit(form);

    expect(fetch).toHaveBeenCalledTimes(1);

    resolvePromise(jsonResponse(200, mockLoginSuccessResponse));
  });

  it("has no accessibility violations in the default state", async () => {
    const { container } = renderScreen();
    await expectNoAccessibilityViolations(container);
  });
});
