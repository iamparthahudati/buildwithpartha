import { act } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest, resetApiClientConfiguration } from "@lib/apiClient";

import { useAuthSession } from "./authSession";
import { AuthSessionProvider } from "./AuthSessionProvider";

const USER_A = Object.freeze({
  id: "00000000-0000-4000-8000-000000000001",
  email: "person-a@example.test",
  displayName: "Person A",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
});

const USER_B = Object.freeze({
  id: "00000000-0000-4000-8000-000000000002",
  email: "person-b@example.test",
  displayName: "Person B",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  weekStart: 1,
});

function renderAuthSession(queryClient: QueryClient, navigate?: (url: string) => void) {
  return renderHook(() => useAuthSession(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider {...(navigate ? { navigate } : {})}>{children}</AuthSessionProvider>
      </QueryClientProvider>
    ),
  });
}

describe("AuthSessionProvider", () => {
  afterEach(() => {
    resetApiClientConfiguration();
  });

  it("starts logged out: no user and no CSRF token in memory", () => {
    const { result } = renderAuthSession(new QueryClient());

    expect(result.current.user).toBeNull();
    expect(result.current.csrfToken).toBeNull();
  });

  it("records a freshly issued session", () => {
    const { result } = renderAuthSession(new QueryClient());

    act(() => {
      result.current.setSession(USER_A, "csrf-token-a");
    });

    expect(result.current.user).toEqual(USER_A);
    expect(result.current.csrfToken).toBe("csrf-token-a");
  });

  it("clears every cached query result on logout", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["tasks"], ["a private task"]);
    const { result } = renderAuthSession(queryClient);

    act(() => {
      result.current.setSession(USER_A, "csrf-token-a");
    });
    expect(queryClient.getQueryData(["tasks"])).toEqual(["a private task"]);

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.csrfToken).toBeNull();
    expect(queryClient.getQueryData(["tasks"])).toBeUndefined();
  });

  it("clears the cache when a different account signs in without an intervening logout", () => {
    const queryClient = new QueryClient();
    const { result } = renderAuthSession(queryClient);

    act(() => {
      result.current.setSession(USER_A, "csrf-token-a");
    });
    queryClient.setQueryData(["tasks"], ["person A's task"]);

    act(() => {
      result.current.setSession(USER_B, "csrf-token-b");
    });

    expect(result.current.user).toEqual(USER_B);
    expect(queryClient.getQueryData(["tasks"])).toBeUndefined();
  });

  it("does not clear the cache when the same account's session is simply refreshed", () => {
    const queryClient = new QueryClient();
    const { result } = renderAuthSession(queryClient);

    act(() => {
      result.current.setSession(USER_A, "csrf-token-a");
    });
    queryClient.setQueryData(["tasks"], ["person A's task"]);

    act(() => {
      result.current.setSession(USER_A, "csrf-token-a-refreshed");
    });

    expect(result.current.csrfToken).toBe("csrf-token-a-refreshed");
    expect(queryClient.getQueryData(["tasks"])).toEqual(["person A's task"]);
  });

  it("throws when used outside an AuthSessionProvider", () => {
    expect(() => renderHook(() => useAuthSession())).toThrowError(
      "useAuthSession must be used within an AuthSessionProvider.",
    );
  });

  it("never reads or writes localStorage or sessionStorage while managing the session", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderAuthSession(new QueryClient());

    act(() => {
      result.current.setSession(USER_A, "csrf-token-a");
    });
    act(() => {
      result.current.clearSession();
    });

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  describe("wiring into the API client", () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let navigateMock: (url: string) => void;

    beforeEach(() => {
      fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      navigateMock = vi.fn<(url: string) => void>();
      window.history.pushState({}, "", "/life-os/app/tasks");
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      window.history.pushState({}, "", "/");
    });

    function problemResponse(status: number, code: string): Response {
      return new Response(
        JSON.stringify({
          type: "https://buildwithpartha.tech/life-os/problems/v1/example",
          title: "Example",
          status,
          detail: "Example detail.",
          instance: "/life-os/api/v1/tasks",
          code,
          correlationId: "11111111-1111-4111-8111-111111111111",
          errors: [],
        }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    }

    it("attaches the current in-memory CSRF token to a mutating request", async () => {
      const { result } = renderAuthSession(new QueryClient());
      act(() => {
        result.current.setSession(USER_A, "csrf-token-a");
      });
      fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

      await apiRequest("/tasks", { method: "POST", body: {} });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Headers).get("X-CSRF-TOKEN")).toBe("csrf-token-a");
    });

    it("clears the session and redirects to login with a returnTo on 401 AUTHENTICATION_REQUIRED", async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["tasks"], ["a private task"]);
      const { result } = renderAuthSession(queryClient, navigateMock);
      act(() => {
        result.current.setSession(USER_A, "csrf-token-a");
      });
      fetchMock.mockResolvedValueOnce(problemResponse(401, "AUTHENTICATION_REQUIRED"));

      await act(async () => {
        await expect(apiRequest("/tasks")).rejects.toThrow();
      });

      expect(result.current.user).toBeNull();
      expect(queryClient.getQueryData(["tasks"])).toBeUndefined();
      expect(navigateMock).toHaveBeenCalledWith("/life-os/login?returnTo=%2Flife-os%2Fapp%2Ftasks");
    });

    it("does not navigate away when there was never a session to recover", async () => {
      renderAuthSession(new QueryClient(), navigateMock);
      fetchMock.mockResolvedValueOnce(problemResponse(401, "AUTHENTICATION_REQUIRED"));

      await expect(apiRequest("/tasks")).rejects.toThrow();

      expect(navigateMock).not.toHaveBeenCalled();
    });
  });
});
