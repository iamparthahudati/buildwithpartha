import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { SecuritySettingsPanel } from "./SecuritySettingsPanel";

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

describe("SecuritySettingsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("renders change password form and sessions", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        sessions: [
          {
            id: "s-1",
            deviceHint: "Mac Chrome",
            createdAt: "2026-08-19T10:00:00Z",
            lastSeenAt: "2026-08-19T10:30:00Z",
            isCurrent: true,
          },
          {
            id: "s-2",
            deviceHint: "iPhone Safari",
            createdAt: "2026-08-18T08:00:00Z",
            lastSeenAt: "2026-08-19T09:00:00Z",
            isCurrent: false,
          },
        ],
      }),
    );

    renderWithClient(<SecuritySettingsPanel />);

    expect(screen.getByRole("heading", { name: "Security" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Change password" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Mac Chrome")).toBeInTheDocument();
      expect(screen.getByText("This device")).toBeInTheDocument();
      expect(screen.getByText("iPhone Safari")).toBeInTheDocument();
    });
  });

  it("validates client-side password inputs before submission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { sessions: [] }));

    renderWithClient(<SecuritySettingsPanel />);
    const user = userEvent.setup();

    const currentPwdInput = screen.getByLabelText(/Current password/);
    const newPwdInput = screen.getByLabelText(/^New password/);
    const confirmPwdInput = screen.getByLabelText(/Confirm new password/);

    await user.type(currentPwdInput, "OldPassword123!");
    await user.type(newPwdInput, "short");
    await user.type(confirmPwdInput, "mismatch");

    const submitBtn = screen.getByRole("button", { name: "Change password" });
    await user.click(submitBtn);

    expect(
      screen.getAllByText("New password must be at least 8 characters long.").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Passwords do not match.").length).toBeGreaterThan(0);
  });

  it("changes password successfully", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { sessions: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { status: "PASSWORD_CHANGED" }))
      .mockResolvedValueOnce(jsonResponse(200, { sessions: [] }));

    renderWithClient(<SecuritySettingsPanel />);
    const user = userEvent.setup();

    const currentPwdInput = screen.getByLabelText(/Current password/);
    const newPwdInput = screen.getByLabelText(/^New password/);
    const confirmPwdInput = screen.getByLabelText(/Confirm new password/);

    await user.type(currentPwdInput, "OldPassword123!");
    await user.type(newPwdInput, "NewSecretPassword123!");
    await user.type(confirmPwdInput, "NewSecretPassword123!");

    const submitBtn = screen.getByRole("button", { name: "Change password" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Password changed successfully. All other sessions have been signed out."),
      ).toBeInTheDocument();
    });
  });

  it("revokes a single other session via confirmation dialog", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(200, {
          sessions: [
            {
              id: "s-1",
              deviceHint: "Mac Chrome",
              createdAt: "2026-08-19T10:00:00Z",
              lastSeenAt: "2026-08-19T10:30:00Z",
              isCurrent: true,
            },
            {
              id: "s-2",
              deviceHint: "iPhone Safari",
              createdAt: "2026-08-18T08:00:00Z",
              lastSeenAt: "2026-08-19T09:00:00Z",
              isCurrent: false,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { revoked: true }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          sessions: [
            {
              id: "s-1",
              deviceHint: "Mac Chrome",
              createdAt: "2026-08-19T10:00:00Z",
              lastSeenAt: "2026-08-19T10:30:00Z",
              isCurrent: true,
            },
          ],
        }),
      );

    renderWithClient(<SecuritySettingsPanel />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText("iPhone Safari")).toBeInTheDocument();
    });

    const revokeBtn = screen.getByRole("button", { name: "Revoke" });
    await user.click(revokeBtn);

    expect(screen.getByText("Revoke session?")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Revoke session" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/sessions/s-2"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("revokes all other sessions via bulk action confirmation dialog", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(200, {
          sessions: [
            {
              id: "s-1",
              deviceHint: "Mac Chrome",
              createdAt: "2026-08-19T10:00:00Z",
              lastSeenAt: "2026-08-19T10:30:00Z",
              isCurrent: true,
            },
            {
              id: "s-2",
              deviceHint: "iPhone Safari",
              createdAt: "2026-08-18T08:00:00Z",
              lastSeenAt: "2026-08-19T09:00:00Z",
              isCurrent: false,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { revokedCount: 1 }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          sessions: [
            {
              id: "s-1",
              deviceHint: "Mac Chrome",
              createdAt: "2026-08-19T10:00:00Z",
              lastSeenAt: "2026-08-19T10:30:00Z",
              isCurrent: true,
            },
          ],
        }),
      );

    renderWithClient(<SecuritySettingsPanel />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sign out all other devices" }),
      ).toBeInTheDocument();
    });

    const bulkBtn = screen.getByRole("button", { name: "Sign out all other devices" });
    await user.click(bulkBtn);

    expect(screen.getByText("Sign out all other devices?")).toBeInTheDocument();

    const dialogButtons = screen.getAllByRole("button", {
      name: "Sign out all other devices",
    });
    const confirmDialogButton = dialogButtons[dialogButtons.length - 1];
    if (confirmDialogButton) {
      await user.click(confirmDialogButton);
    }

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/sessions/revoke-others"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
