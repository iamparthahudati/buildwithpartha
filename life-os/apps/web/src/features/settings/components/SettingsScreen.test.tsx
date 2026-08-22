import { useEffect, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfileResponse } from "@features/user";
import { resetApiClientConfiguration } from "@lib/apiClient";
import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";

import { SettingsScreen } from "./SettingsScreen";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const mockProfile: UserProfileResponse = {
  id: "user-123",
  email: "partha@example.test",
  displayName: "Partha H",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
};

const mockAuthUser: AuthUser = {
  id: "user-123",
  email: "partha@example.test",
  displayName: "Partha H",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
};

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

describe("SettingsScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("renders loading state while profile is loading", () => {
    const queryClient = new QueryClient();
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

    render(<SettingsScreen />, {
      wrapper: createWrapper(queryClient),
    });

    expect(screen.getByTestId("settings-screen-loading")).toBeInTheDocument();
  });

  it("renders error state on load failure", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));

    render(<SettingsScreen />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByTestId("settings-screen-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Couldn't load settings")).toBeInTheDocument();
  });

  it("renders settings screen with tabs and default Profile panel", async () => {
    const queryClient = new QueryClient();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockProfile));

    render(<SettingsScreen />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByTestId("settings-screen")).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Localization" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Security" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Data & privacy" })).toBeInTheDocument();

    expect(screen.getByTestId("profile-settings-panel")).toBeInTheDocument();
  });

  it("switches to Localization panel on tab click", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockProfile));

    const onSectionChange = vi.fn();
    render(<SettingsScreen onSectionChange={onSectionChange} />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByTestId("settings-screen")).toBeInTheDocument();
    });

    const localizationTab = screen.getByRole("tab", { name: "Localization" });
    await user.click(localizationTab);

    expect(onSectionChange).toHaveBeenCalledWith("localization");
    expect(screen.getByTestId("localization-settings-panel")).toBeInTheDocument();
  });

  it("renders custom securityPanel and dataPanel slots when provided", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    render(
      <SettingsScreen
        profile={mockProfile}
        securityPanel={<div data-testid="custom-security">Custom Security Content</div>}
        dataPanel={<div data-testid="custom-data">Custom Data Content</div>}
      />,
      {
        wrapper: createWrapper(queryClient),
      },
    );

    const securityTab = screen.getByRole("tab", { name: "Security" });
    await user.click(securityTab);
    expect(screen.getByTestId("custom-security")).toBeInTheDocument();

    const dataTab = screen.getByRole("tab", { name: "Data & privacy" });
    await user.click(dataTab);
    expect(screen.getByTestId("custom-data")).toBeInTheDocument();
  });

  it("renders SecuritySettingsPanel when clicking Security tab by default", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, mockProfile))
      .mockResolvedValueOnce(jsonResponse(200, { sessions: [] }));

    render(<SettingsScreen profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    const securityTab = screen.getByRole("tab", { name: "Security" });
    await user.click(securityTab);

    expect(screen.getByTestId("security-settings-panel")).toBeInTheDocument();
  });

  it("renders PrivacySettingsPanel when clicking Data & privacy tab by default", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, mockProfile))
      .mockResolvedValueOnce(jsonResponse(200, { exports: [] }));

    render(<SettingsScreen profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    const dataTab = screen.getByRole("tab", { name: "Data & privacy" });
    await user.click(dataTab);

    expect(screen.getByTestId("privacy-settings-panel")).toBeInTheDocument();
  });
});
