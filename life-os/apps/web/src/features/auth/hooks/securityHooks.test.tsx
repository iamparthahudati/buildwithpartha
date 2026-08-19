import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { useChangePassword } from "./useChangePassword";
import { useRevokeAllOtherSessions } from "./useRevokeAllOtherSessions";
import { useRevokeSession } from "./useRevokeSession";
import { useUserSessions } from "./useUserSessions";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("Security Hooks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  describe("useChangePassword", () => {
    it("reports success on password change", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { status: "PASSWORD_CHANGED" }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useChangePassword(), { wrapper });

      act(() => {
        result.current.mutate({
          currentPassword: "OldPassword123!",
          newPassword: "NewValidPassword456!",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ status: "PASSWORD_CHANGED" });
    });
  });

  describe("useUserSessions", () => {
    it("fetches active sessions", async () => {
      const mockSessions = [
        {
          id: "session-1",
          deviceHint: "Mac Chrome",
          createdAt: "2026-08-19T10:00:00Z",
          lastSeenAt: "2026-08-19T10:30:00Z",
          isCurrent: true,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { sessions: mockSessions }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUserSessions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.sessions).toEqual(mockSessions);
    });
  });

  describe("useRevokeSession", () => {
    it("revokes a single session and invalidates cache", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { revoked: true }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRevokeSession(), { wrapper });

      act(() => {
        result.current.mutate("session-1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ revoked: true });
    });
  });

  describe("useRevokeAllOtherSessions", () => {
    it("revokes other sessions and invalidates cache", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { revokedCount: 2 }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useRevokeAllOtherSessions(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ revokedCount: 2 });
    });
  });
});
