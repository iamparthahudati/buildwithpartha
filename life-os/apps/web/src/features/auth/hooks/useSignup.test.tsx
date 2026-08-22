import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { useSignup } from "./useSignup";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function wrapper({ children }: { readonly children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useSignup", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("reports success for the generic PENDING_VERIFICATION response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));

    const { result } = renderHook(() => useSignup(), { wrapper });

    act(() => {
      result.current.mutate({
        email: "person@example.test",
        password: "correct-horse-battery-staple",
        displayName: "Person",
        termsVersion: "2026-08-01",
        privacyVersion: "2026-08-01",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ status: "PENDING_VERIFICATION" });
  });

  it("reports the same success shape for a duplicate email — enumeration safety", async () => {
    // The backend returns identically for a duplicate and a fresh signup;
    // this hook has no way to and must not invent a distinction.
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(202, { status: "PENDING_VERIFICATION" }));

    const { result } = renderHook(() => useSignup(), { wrapper });

    act(() => {
      result.current.mutate({
        email: "already-registered@example.test",
        password: "correct-horse-battery-staple",
        displayName: "Person",
        termsVersion: "2026-08-01",
        privacyVersion: "2026-08-01",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ status: "PENDING_VERIFICATION" });
  });

  it("surfaces a rejected mutation on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/example",
          title: "Too many requests",
          status: 429,
          detail: "Try again later.",
          instance: "/life-os/api/v1/auth/signup",
          code: "RATE_LIMITED",
          correlationId: "11111111-1111-4111-8111-111111111111",
          errors: [],
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useSignup(), { wrapper });

    act(() => {
      result.current.mutate({
        email: "person@example.test",
        password: "correct-horse-battery-staple",
        displayName: "Person",
        termsVersion: "2026-08-01",
        privacyVersion: "2026-08-01",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
