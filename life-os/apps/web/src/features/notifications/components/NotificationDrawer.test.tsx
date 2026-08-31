import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClientConfiguration } from "@lib/apiClient";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { NotificationDrawer } from "./NotificationDrawer";

const mockAuthUser: AuthUser = {
  id: "user-1",
  email: "user@example.test",
  displayName: "Test User",
  timeZone: "UTC",
  locale: "en-US",
  weekStart: 1,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function SessionSeeder({ children }: { readonly children: ReactNode }) {
  const { setSession } = useAuthSession();
  useEffect(() => {
    setSession(mockAuthUser, "test-csrf-token");
  }, [setSession]);
  return <>{children}</>;
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider restoreSession={false}>
          <SessionSeeder>{children}</SessionSeeder>
        </AuthSessionProvider>
      </QueryClientProvider>
    );
  };
}

describe("NotificationDrawer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("renders open drawer with notification content and passes accessibility checks", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/notifications/unread-count")) {
        return jsonResponse(200, { count: 0 });
      }
      if (url.includes("/notifications")) {
        return jsonResponse(200, { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 });
      }
      return jsonResponse(404, {});
    });

    const handleClose = vi.fn();

    const { container } = render(<NotificationDrawer open={true} onClose={handleClose} />, {
      wrapper: createWrapper(queryClient),
    });

    expect(await screen.findByTestId("notification-drawer")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });
});
