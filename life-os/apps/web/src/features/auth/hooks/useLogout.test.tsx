import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { useAuthSession } from "@state/authSession";

import { useLogout } from "./useLogout";

const USER = Object.freeze({
  id: "00000000-0000-4000-8000-000000000001",
  email: "person@example.test",
  displayName: "Person",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </QueryClientProvider>
    );
  };
}

describe("useLogout", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("clears the session, clears the query cache and returns to login on success", async () => {
    const navigate = vi.fn();
    const queryClient = new QueryClient();
    queryClient.setQueryData(["tasks"], ["a private task"]);
    const wrapper = buildWrapper(queryClient);

    const { result } = renderHook(
      () => ({ logout: useLogout({ navigate }), session: useAuthSession() }),
      { wrapper },
    );
    act(() => {
      result.current.session.setSession(USER, "csrf-token");
    });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "LOGGED_OUT" }));

    act(() => {
      result.current.logout.mutate();
    });

    await waitFor(() => expect(result.current.logout.isSuccess).toBe(true));

    expect(result.current.session.user).toBeNull();
    expect(queryClient.getQueryData(["tasks"])).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith("/life-os/login");
  });

  it("calls /auth/logout-all when allDevices is requested", async () => {
    const navigate = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = buildWrapper(queryClient);

    const { result } = renderHook(() => useLogout({ allDevices: true, navigate }), { wrapper });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "LOGGED_OUT" }));

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/auth/logout-all");
  });

  it("leaves the session untouched when the CSRF header is rejected", async () => {
    const navigate = vi.fn();
    const queryClient = new QueryClient();
    const wrapper = buildWrapper(queryClient);

    const { result } = renderHook(
      () => ({ logout: useLogout({ navigate }), session: useAuthSession() }),
      { wrapper },
    );
    act(() => {
      result.current.session.setSession(USER, "csrf-token");
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/example",
          title: "Forbidden",
          status: 403,
          detail: "The CSRF token is missing or does not match.",
          instance: "/life-os/api/v1/auth/logout",
          code: "CSRF_TOKEN_INVALID",
          correlationId: "11111111-1111-4111-8111-111111111111",
          errors: [],
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    act(() => {
      result.current.logout.mutate();
    });

    await waitFor(() => expect(result.current.logout.isError).toBe(true));

    expect(result.current.session.user).toEqual(USER);
    expect(navigate).not.toHaveBeenCalled();
  });
});
