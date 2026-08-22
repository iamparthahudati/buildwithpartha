import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { useResetPassword } from "./useResetPassword";

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
    instance: "/life-os/api/v1/auth/reset-password",
    code,
    correlationId: "11111111-1111-4111-8111-111111111111",
    errors: [],
  });
}

function wrapper({ children }: { readonly children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useResetPassword", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("reports success for PASSWORD_RESET response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "PASSWORD_RESET" }));

    const { result } = renderHook(() => useResetPassword(), { wrapper });

    act(() => {
      result.current.mutate({
        token: "test-token",
        newPassword: "correct-horse-battery-staple",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ status: "PASSWORD_RESET" });
  });

  it("surfaces error when token is expired", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(400, "TOKEN_EXPIRED"));

    const { result } = renderHook(() => useResetPassword(), { wrapper });

    act(() => {
      result.current.mutate({
        token: "expired-token",
        newPassword: "correct-horse-battery-staple",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("surfaces error when token is already used", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(problemResponse(409, "TOKEN_ALREADY_USED"));

    const { result } = renderHook(() => useResetPassword(), { wrapper });

    act(() => {
      result.current.mutate({
        token: "used-token",
        newPassword: "correct-horse-battery-staple",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
