import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { useVerifyEmail } from "./useVerifyEmail";

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

describe("useVerifyEmail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("reports success for the VERIFIED response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "VERIFIED" }));

    const { result } = renderHook(() => useVerifyEmail(), { wrapper });

    act(() => {
      result.current.mutate({
        token: "valid-raw-token",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ status: "VERIFIED" });
  });

  it("surfaces a rejected mutation on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/token-expired",
          title: "Token expired",
          status: 400,
          detail: "The verification token has expired.",
          instance: "/life-os/api/v1/auth/verify-email",
          code: "TOKEN_EXPIRED",
          correlationId: "11111111-1111-4111-8111-111111111111",
          errors: [],
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useVerifyEmail(), { wrapper });

    act(() => {
      result.current.mutate({
        token: "expired-token",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
