import { useEffect, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfileResponse } from "@features/user";
import { resetApiClientConfiguration } from "@lib/apiClient";
import { useAuthSession, type AuthUser } from "@state/authSession";
import { AuthSessionProvider } from "@state/AuthSessionProvider";

import { ProfileSettingsPanel } from "./ProfileSettingsPanel";

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
        <AuthSessionProvider>
          <SessionSeeder>{children}</SessionSeeder>
        </AuthSessionProvider>
      </QueryClientProvider>
    );
  };
}

describe("ProfileSettingsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("renders profile fields with current values", () => {
    const queryClient = new QueryClient();
    render(<ProfileSettingsPanel profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveValue("partha@example.test");
    expect(screen.getByLabelText("Email address")).toHaveAttribute("readonly");
    expect(screen.getByLabelText(/Display name/)).toHaveValue("Partha H");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("enables save button when display name changes and saves successfully", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const updatedProfile = { ...mockProfile, displayName: "Partha Hudati" };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updatedProfile));

    render(<ProfileSettingsPanel profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    const displayNameInput = screen.getByLabelText(/Display name/);
    await user.clear(displayNameInput);
    await user.type(displayNameInput, "Partha Hudati");

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Profile settings saved.")).toBeInTheDocument();
    });
  });

  it("validates empty display name client-side", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    render(<ProfileSettingsPanel profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    const displayNameInput = screen.getByLabelText(/Display name/);
    await user.clear(displayNameInput);

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getAllByText("Display name is required.").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("handles server field error responses gracefully", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const problemResponse = {
      type: "https://lifeos.internal/problems/validation-failed",
      title: "Validation Failed",
      status: 400,
      detail: "Validation failed",
      errors: [{ field: "displayName", code: "NotBlank" }],
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(400, problemResponse));

    render(<ProfileSettingsPanel profile={mockProfile} />, {
      wrapper: createWrapper(queryClient),
    });

    const displayNameInput = screen.getByLabelText(/Display name/);
    await user.type(displayNameInput, " new");

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getAllByText("Display name is required.").length).toBeGreaterThanOrEqual(1);
    });
  });
});
