import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            type: "https://buildwithpartha.tech/life-os/problems/v1/example",
            title: "Unauthorized",
            status: 401,
            detail: "Authentication required.",
            instance: "/life-os/api/v1/auth/session",
            code: "AUTHENTICATION_REQUIRED",
            correlationId: "11111111-1111-4111-8111-111111111111",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("redirects to login with the current path as returnTo when signed out", async () => {
    window.history.pushState({}, "", "/life-os/app/tasks?status=open");
    const navigate = vi.fn();

    renderGuarded(navigate);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        "/life-os/login?returnTo=%2Flife-os%2Fapp%2Ftasks%3Fstatus%3Dopen",
      );
    });
  });

  it("renders nothing while signed out — no flash of protected content", async () => {
    const navigate = vi.fn();

    renderGuarded(navigate);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders children once a session exists, without navigating away", async () => {
    const navigate = vi.fn();
    const { user } = renderGuarded(navigate);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });
    navigate.mockClear();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("redirects again once the session is cleared", async () => {
    const navigate = vi.fn();
    const { user } = renderGuarded(navigate);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });
    navigate.mockClear();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    navigate.mockClear();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(navigate).toHaveBeenCalledWith("/life-os/login");
  });

  it("has no accessibility violations once content renders", async () => {
    const navigate = vi.fn();
    const { user, container } = renderGuarded(navigate);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await expectNoAccessibilityViolations(container);
  });
});
