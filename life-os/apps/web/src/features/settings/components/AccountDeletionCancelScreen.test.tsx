import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { renderWithUser } from "@test/render";

import {
  AccountDeletionCancelScreen,
  type AccountDeletionCancelScreenProps,
} from "./AccountDeletionCancelScreen";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function problemResponse(status: number, code: string): Response {
  return jsonResponse(status, {
    type: "https://buildwithpartha.tech/life-os/problems/v1/example",
    title: "Example failure",
    status,
    detail: "Example detail.",
    instance: "/life-os/api/v1/auth/cancel-deletion",
    code,
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [],
  });
}

function renderScreen(props: AccountDeletionCancelScreenProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider restoreSession={false}>
        <AccountDeletionCancelScreen {...props} />
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

describe("AccountDeletionCancelScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/life-os/cancel-deletion");
  });

  it("auto-triggers cancellation with the given token and shows the cancelled state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "CANCELLED" }));

    renderScreen({ token: "sample-cancel-token" });

    expect(
      screen.getByRole("heading", { level: 1, name: "Cancelling deletion request" }),
    ).toBeVisible();

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/auth/cancel-deletion");
    expect(JSON.parse(init.body as string)).toEqual({ token: "sample-cancel-token" });

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Deletion cancelled" })).toBeVisible(),
    );
    expect(screen.getByText(/Your account is active again/)).toBeVisible();
  });

  it("reads the token from the URL search params when the prop is omitted", async () => {
    window.history.replaceState({}, "", "/life-os/cancel-deletion?token=url-cancel-token");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "CANCELLED" }));

    renderScreen();

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Deletion cancelled" })).toBeVisible(),
    );

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ token: "url-cancel-token" });
  });

  it("renders the invalid state when no token is present at all", () => {
    renderScreen();

    expect(
      screen.getByRole("heading", { level: 1, name: "Invalid cancellation link" }),
    ).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps TOKEN_EXPIRED to the already-deleted state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_EXPIRED"));

    renderScreen({ token: "expired-token" });

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Account already deleted" }),
      ).toBeVisible(),
    );
  });

  it("maps TOKEN_ALREADY_USED to the already-used state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(409, "TOKEN_ALREADY_USED"));

    renderScreen({ token: "used-token" });

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Link already used" })).toBeVisible(),
    );
  });

  it("maps TOKEN_INVALID to the invalid state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_INVALID"));

    renderScreen({ token: "invalid-token" });

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Invalid cancellation link" }),
      ).toBeVisible(),
    );
  });

  it("falls back to a generic error state for an unexpected failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(500, "INTERNAL_ERROR"));

    renderScreen({ token: "server-error-token" });

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible(),
    );
  });

  it("navigates to login when signing in from the cancelled state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "CANCELLED" }));
    const navigate = vi.fn();

    const { user } = renderScreen({ token: "sample-cancel-token", navigate });

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Deletion cancelled" })).toBeVisible(),
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(navigate).toHaveBeenCalledWith("/life-os/login");
  });
});
