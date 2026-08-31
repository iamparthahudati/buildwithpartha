import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClientConfiguration } from "@lib/apiClient";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { NotificationPreferencesPanel } from "./NotificationPreferencesPanel";
import type { NotificationPreferences } from "../model/notifications";

const SAMPLE_PREFERENCES: NotificationPreferences = {
  id: "pref-1",
  userId: "user-1",
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  dueRemindersEnabled: true,
  overdueRemindersEnabled: true,
  timeBlockRemindersEnabled: true,
  focusRemindersEnabled: true,
  habitRemindersEnabled: true,
  reviewPromptsEnabled: true,
  securityNoticesEnabled: true,
  systemNoticesEnabled: true,
  inAppChannelEnabled: true,
  emailChannelEnabled: true,
  pushChannelEnabled: false,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  version: 1,
};

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

describe("NotificationPreferencesPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("loads preferences and passes accessibility audit", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/notifications/preferences")) {
        return jsonResponse(200, SAMPLE_PREFERENCES);
      }
      return jsonResponse(404, {});
    });

    const { container } = render(<NotificationPreferencesPanel />, {
      wrapper: createWrapper(queryClient),
    });

    await screen.findByTestId("notification-preferences-panel");
    expect(screen.getByRole("switch", { name: "Enable quiet hours" })).toBeChecked();
    expect(screen.getByLabelText("Quiet hours start")).toHaveValue("22:00");
    expect(screen.getByRole("switch", { name: "Push notifications" })).not.toBeChecked();

    await expectNoAccessibilityViolations(container);
  });

  it("saves updated preferences successfully", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/notifications/preferences")) {
        return jsonResponse(200, SAMPLE_PREFERENCES);
      }
      return jsonResponse(404, {});
    });

    render(<NotificationPreferencesPanel />, {
      wrapper: createWrapper(queryClient),
    });

    await screen.findByTestId("notification-preferences-panel");
    const pushSwitch = screen.getByRole("switch", { name: "Push notifications" });
    await user.click(pushSwitch);

    const saveBtn = screen.getByRole("button", { name: "Save preferences" });
    await user.click(saveBtn);

    expect(
      await screen.findByText("Notification preferences updated successfully."),
    ).toBeInTheDocument();
  });
});
