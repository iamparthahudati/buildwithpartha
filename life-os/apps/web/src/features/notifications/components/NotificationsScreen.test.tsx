import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClientConfiguration } from "@lib/apiClient";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { NotificationsScreen } from "./NotificationsScreen";

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
          <SessionSeeder>
            <MemoryRouter>{children}</MemoryRouter>
          </SessionSeeder>
        </AuthSessionProvider>
      </QueryClientProvider>
    );
  };
}

describe("NotificationsScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("renders screen header and notification center, passing accessibility checks", async () => {
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

    const { container } = render(<NotificationsScreen />, {
      wrapper: createWrapper(queryClient),
    });

    expect(await screen.findByTestId("notifications-screen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Notifications", level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId("notification-center")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });
});
