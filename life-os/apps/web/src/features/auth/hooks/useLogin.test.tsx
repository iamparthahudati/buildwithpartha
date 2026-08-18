import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { useAuthSession } from "@state/authSession";

import { useLogin } from "./useLogin";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function wrapper({ children }: { readonly children: ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>{children}</AuthSessionProvider>
    </QueryClientProvider>
  );
}

describe("useLogin", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("stores the safe user fields and CSRF token in the session on success, never the raw session token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, {
        id: "00000000-0000-4000-8000-000000000001",
        email: "person@example.test",
        displayName: "Person",
        timeZone: "Asia/Kolkata",
        locale: "en-IN",
        weekStart: 1,
        csrfToken: "issued-csrf-token",
      }),
    );

    const { result } = renderHook(() => ({ login: useLogin(), session: useAuthSession() }), {
      wrapper,
    });

    act(() => {
      result.current.login.mutate({ email: "person@example.test", password: "secret" });
    });

    await waitFor(() => expect(result.current.login.isSuccess).toBe(true));

    expect(result.current.session.user).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      email: "person@example.test",
      displayName: "Person",
      timeZone: "Asia/Kolkata",
      locale: "en-IN",
      weekStart: 1,
    });
    expect(result.current.session.csrfToken).toBe("issued-csrf-token");
    // The stored user object carries none of LoginResponse's own extra keys.
    expect(result.current.session.user).not.toHaveProperty("csrfToken");
  });

  it("leaves the session untouched on a failed login", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/example",
          title: "Unauthorized",
          status: 401,
          detail: "Email or password is incorrect.",
          instance: "/life-os/api/v1/auth/login",
          code: "INVALID_CREDENTIALS",
          correlationId: "11111111-1111-4111-8111-111111111111",
          errors: [],
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => ({ login: useLogin(), session: useAuthSession() }), {
      wrapper,
    });

    act(() => {
      result.current.login.mutate({ email: "person@example.test", password: "wrong" });
    });

    await waitFor(() => expect(result.current.login.isError).toBe(true));

    expect(result.current.session.user).toBeNull();
    expect(result.current.session.csrfToken).toBeNull();
  });
});
