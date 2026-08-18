import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { useAuthSession } from "@state/authSession";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { RequireAuth } from "./RequireAuth";

const USER = Object.freeze({
  id: "00000000-0000-4000-8000-000000000001",
  email: "person@example.test",
  displayName: "Person",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
});

function SessionControls() {
  const { setSession, clearSession } = useAuthSession();
  return (
    <>
      <button type="button" onClick={() => setSession(USER, "csrf-token")}>
        Sign in
      </button>
      <button type="button" onClick={clearSession}>
        Sign out
      </button>
    </>
  );
}

function renderGuarded(navigate: (url: string) => void) {
  const queryClient = new QueryClient();
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider navigate={navigate}>
        <SessionControls />
        <RequireAuth navigate={navigate}>
          <p>Protected content</p>
        </RequireAuth>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

describe("RequireAuth", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("redirects to login with the current path as returnTo when signed out", () => {
    window.history.pushState({}, "", "/life-os/app/tasks?status=open");
    const navigate = vi.fn();

    renderGuarded(navigate);

    expect(navigate).toHaveBeenCalledWith(
      "/life-os/login?returnTo=%2Flife-os%2Fapp%2Ftasks%3Fstatus%3Dopen",
    );
  });

  it("renders nothing while signed out — no flash of protected content", () => {
    const navigate = vi.fn();

    renderGuarded(navigate);

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders children once a session exists, without navigating away", async () => {
    const navigate = vi.fn();
    const { user } = renderGuarded(navigate);
    navigate.mockClear();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("redirects again once the session is cleared", async () => {
    const navigate = vi.fn();
    const { user } = renderGuarded(navigate);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    navigate.mockClear();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(navigate).toHaveBeenCalledWith("/life-os/login");
  });

  it("has no accessibility violations once content renders", async () => {
    const navigate = vi.fn();
    const { user, container } = renderGuarded(navigate);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await expectNoAccessibilityViolations(container);
  });
});
