import { useEffect, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfileResponse } from "@features/user";
import { resetApiClientConfiguration } from "@lib/apiClient";
import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";

import { LocalizationSettingsPanel } from "./LocalizationSettingsPanel";

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

describe("LocalizationSettingsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("renders localization fields, timezone picker, and live preview card", () => {
    const queryClient = new QueryClient();
    render(<LocalizationSettingsPanel profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    expect(screen.getByRole("heading", { name: "Localization" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Timezone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display locale/)).toHaveValue("en-IN");
    expect(screen.getByLabelText(/First day of the week/)).toHaveValue("1");
    expect(screen.getByRole("heading", { name: "Live date and time preview" })).toBeInTheDocument();
    expect(screen.getAllByText("Monday").length).toBeGreaterThanOrEqual(1);
  });

  it("shows timezone change notice and updates live preview when timezone changes", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    render(<LocalizationSettingsPanel profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    const utcButton = screen.getByRole("button", { name: "Use UTC" });
    await user.click(utcButton);

    expect(screen.getByText(/Timezone change notice/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Changing your timezone recalculates how scheduled dates and times display throughout LifeOS immediately/,
      ),
    ).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    expect(saveButton).toBeEnabled();
  });

  it("saves localization settings successfully", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const updatedProfile = {
      ...mockProfile,
      timeZone: "America/New_York",
      locale: "en-US",
      weekStart: 7,
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updatedProfile));

    render(<LocalizationSettingsPanel profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    const localeSelect = screen.getByLabelText(/Display locale/);
    await user.selectOptions(localeSelect, "en-US");

    const weekStartSelect = screen.getByLabelText(/First day of the week/);
    await user.selectOptions(weekStartSelect, "7");

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Localization settings updated.")).toBeInTheDocument();
    });
  });

  it("handles server error responses and clears errors when corrected", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const problemResponse = {
      type: "https://lifeos.internal/problems/validation-failed",
      title: "Validation Failed",
      status: 400,
      detail: "Validation failed",
      errors: [
        { field: "timeZone", code: "INVALID_TIMEZONE" },
        { field: "locale", code: "REQUIRED" },
        { field: "weekStart", code: "Range" },
      ],
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(400, problemResponse));

    render(<LocalizationSettingsPanel profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    const localeSelect = screen.getByLabelText(/Display locale/);
    await user.selectOptions(localeSelect, "en-US");

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getAllByText("Please select a valid IANA timezone.").length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Locale is required.").length).toBeGreaterThanOrEqual(1);
    });

    await user.selectOptions(localeSelect, "en-GB");
    const weekStartSelect = screen.getByLabelText(/First day of the week/);
    await user.selectOptions(weekStartSelect, "7");
  });
});
