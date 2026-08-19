import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfileResponse } from "@features/user";
import { resetApiClientConfiguration } from "@lib/apiClient";

import { PrivacySettingsPanel } from "./PrivacySettingsPanel";

const mockProfile: UserProfileResponse = {
  id: "u-1",
  email: "user@example.test",
  displayName: "Partha Hudati",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("PrivacySettingsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("renders export section and loads existing export records", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        exports: [
          {
            id: "exp-1",
            fileName: "lifeos-export-20260819.zip",
            fileSizeBytes: 204800,
            status: "READY",
            expiresAt: "2026-08-26T10:00:00Z",
            downloadedAt: null,
            createdAt: "2026-08-19T10:00:00Z",
          },
        ],
      }),
    );

    renderWithClient(<PrivacySettingsPanel profile={mockProfile} />);

    expect(screen.getByText("Data export")).toBeInTheDocument();
    expect(screen.getByText("Delete account")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("lifeos-export-20260819.zip")).toBeInTheDocument();
      expect(screen.getByText("READY")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
    });
  });

  it("requests a new data export archive", async () => {
    const user = userEvent.setup();

    // Initial status query
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { exports: [] }));

    renderWithClient(<PrivacySettingsPanel profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText("No previous export requests.")).toBeInTheDocument();
    });

    // POST /auth/export mutation
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(202, {
        id: "exp-2",
        fileName: "lifeos-export-20260819-120000.zip",
        fileSizeBytes: null,
        status: "GENERATING",
        expiresAt: "2026-08-26T12:00:00Z",
        downloadedAt: null,
        createdAt: "2026-08-19T12:00:00Z",
      }),
    );

    // Invalidation query refetch
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        exports: [
          {
            id: "exp-2",
            fileName: "lifeos-export-20260819-120000.zip",
            fileSizeBytes: null,
            status: "GENERATING",
            expiresAt: "2026-08-26T12:00:00Z",
            downloadedAt: null,
            createdAt: "2026-08-19T12:00:00Z",
          },
        ],
      }),
    );

    await user.click(screen.getByTestId("request-export-button"));

    await waitFor(() => {
      expect(screen.getByText(/Your data export archive is being prepared/)).toBeInTheDocument();
      expect(screen.getByText("lifeos-export-20260819-120000.zip")).toBeInTheDocument();
      expect(screen.getByText("GENERATING")).toBeInTheDocument();
    });
  });

  it("opens deletion dialog and validates matching display name and password", async () => {
    const user = userEvent.setup();
    const onAccountDeleted = vi.fn();

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { exports: [] }));

    renderWithClient(
      <PrivacySettingsPanel profile={mockProfile} onAccountDeleted={onAccountDeleted} />,
    );

    await waitFor(() => {
      expect(screen.getByText("No previous export requests.")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("open-delete-account-button"));

    expect(screen.getByText("Permanently delete account?")).toBeInTheDocument();

    const nameInput = screen.getByTestId("delete-confirmation-input");
    const passwordInput = screen.getByTestId("delete-password-input");
    const confirmButton = screen.getByRole("button", { name: "Yes, permanently delete" });

    expect(confirmButton).toBeDisabled();

    await user.type(nameInput, "Partha Hudati");
    await user.type(passwordInput, "ValidPassword123!");

    expect(confirmButton).not.toBeDisabled();

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        status: "DELETED",
        message: "Account deleted",
        requestedAt: "2026-08-19T12:00:00Z",
      }),
    );

    await user.click(confirmButton);

    await waitFor(() => {
      expect(onAccountDeleted).toHaveBeenCalledTimes(1);
    });
  });

  it("displays server validation error when password is wrong", async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { exports: [] }));

    renderWithClient(<PrivacySettingsPanel profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText("No previous export requests.")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("open-delete-account-button"));

    const nameInput = screen.getByTestId("delete-confirmation-input");
    const passwordInput = screen.getByTestId("delete-password-input");
    const confirmButton = screen.getByRole("button", { name: "Yes, permanently delete" });

    await user.type(nameInput, "Partha Hudati");
    await user.type(passwordInput, "WrongPassword123!");

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(400, {
        code: "VALIDATION_FAILED",
        detail: "Invalid current password",
        errors: [
          {
            field: "currentPassword",
            code: "INVALID_CURRENT_PASSWORD",
            message: "Invalid current password",
          },
        ],
      }),
    );

    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid current password")).toBeInTheDocument();
    });
  });
});
