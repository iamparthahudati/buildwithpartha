import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { useFocusSession } from "./useFocusSession";

const NOW = Date.parse("2026-08-24T10:00:00Z");

function response(status: number, body?: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    ...(status === 204 ? {} : { headers: { "Content-Type": "application/json" } }),
  });
}

function requestUrl(input: string | URL | Request): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

function session(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date(NOW).toISOString();
  return {
    id: "focus-1",
    taskId: "task-1",
    timeBlockId: "block-1",
    status: "RUNNING",
    phase: "FOCUS",
    plannedFocusDurationSeconds: 1500,
    plannedBreakDurationSeconds: 300,
    actualFocusDurationSeconds: 60,
    actualBreakDurationSeconds: 0,
    startedAt: now,
    phaseStartedAt: now,
    pausedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    serverNow: now,
    version: 3,
    interruptions: [],
    ...overrides,
  };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useFocusSession(), { wrapper }) };
}

describe("useFocusSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("BroadcastChannel", undefined);
    vi.setSystemTime(NOW);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reconciles a stale-version conflict instead of overwriting newer tab state", async () => {
    let activeReads = 0;
    vi.mocked(fetch).mockImplementation((url) => {
      const path = requestUrl(url);
      if (path.endsWith("/focus-sessions/active")) {
        activeReads += 1;
        return Promise.resolve(
          response(
            200,
            activeReads === 1
              ? session()
              : session({ status: "PAUSED", pausedAt: new Date(NOW).toISOString(), version: 4 }),
          ),
        );
      }
      if (path.endsWith("/focus-sessions/focus-1/pause")) {
        return Promise.resolve(
          response(409, {
            type: "about:blank",
            title: "Conflict",
            status: 409,
            detail: "Focus Session was updated by another request",
            instance: path,
            code: "CONCURRENCY_CONFLICT",
            correlationId: "test-correlation",
          }),
        );
      }
      return Promise.resolve(response(404, {}));
    });

    const { result } = setup();
    await waitFor(() => expect(result.current.session?.version).toBe(3));
    await act(async () => {
      await result.current.pause().catch(() => undefined);
    });
    await waitFor(() => expect(result.current.session?.version).toBe(4));
    expect(result.current.message).toMatch(/changed in another tab/i);
    expect(result.current.session?.status).toBe("PAUSED");
  });

  it("completes once, retains the initiating tab summary, and invalidates linked projections", async () => {
    vi.mocked(fetch).mockImplementation((url, init) => {
      const path = requestUrl(url);
      if (path.endsWith("/focus-sessions/active")) {
        return Promise.resolve(response(200, session()));
      }
      if (path.endsWith("/focus-sessions/focus-1/complete")) {
        expect(JSON.parse(String(init?.body))).toEqual({ version: 3 });
        expect(new Headers(init?.headers).get("Idempotency-Key")).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
        return Promise.resolve(
          response(
            200,
            session({
              status: "COMPLETED",
              endedAt: new Date(NOW).toISOString(),
              phaseStartedAt: null,
              actualFocusDurationSeconds: 600,
              version: 4,
            }),
          ),
        );
      }
      return Promise.resolve(response(404, {}));
    });

    const { client, result } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await waitFor(() => expect(result.current.session).not.toBeNull());
    await act(async () => void (await result.current.complete()));

    expect(result.current.session).toBeNull();
    expect(result.current.terminalSession?.status).toBe("COMPLETED");
    for (const queryKey of [["today"], ["tasks"], ["time-blocks"], ["calendar"]]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
    }
  });

  it("records an interruption and resumes focus from break with versioned writes", async () => {
    let canonical = session({ phase: "BREAK", actualBreakDurationSeconds: 30 });
    const paths: string[] = [];
    vi.mocked(fetch).mockImplementation((url) => {
      const path = requestUrl(url);
      if (path.endsWith("/focus-sessions/active")) return Promise.resolve(response(200, canonical));
      paths.push(path);
      if (path.endsWith("/interruptions")) {
        canonical = session({ ...canonical, version: 4, interruptions: [{ id: "note-1" }] });
        return Promise.resolve(response(200, canonical));
      }
      if (path.endsWith("/resume-focus")) {
        canonical = session({ ...canonical, phase: "FOCUS", version: 5 });
        return Promise.resolve(response(200, canonical));
      }
      return Promise.resolve(response(404, {}));
    });

    const { result } = setup();
    await waitFor(() => expect(result.current.session).not.toBeNull());
    await act(async () => void (await result.current.saveInterruption("Doorbell")));
    await act(async () => void (await result.current.skipBreak()));
    expect(paths.some((path) => path.endsWith("/focus-1/interruptions"))).toBe(true);
    expect(paths.some((path) => path.endsWith("/focus-1/resume-focus"))).toBe(true);
    expect(result.current.session?.phase).toBe("FOCUS");
  });

  it("does not query or invent state while initially offline", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const { result } = setup();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.loadError).toMatch(/reconnect/i);
    expect(result.current.disabledReason).toMatch(/offline/i);
  });

  it("completes an expired break once across two consumers and shares the terminal summary", async () => {
    let completionCalls = 0;
    vi.mocked(fetch).mockImplementation((url) => {
      const path = requestUrl(url);
      if (path.endsWith("/focus-sessions/active")) {
        return Promise.resolve(
          response(
            200,
            session({
              phase: "BREAK",
              plannedBreakDurationSeconds: 1,
              actualFocusDurationSeconds: 300,
            }),
          ),
        );
      }
      if (path.endsWith("/focus-sessions/focus-1/complete")) {
        completionCalls += 1;
        return Promise.resolve(
          response(
            200,
            session({
              status: "COMPLETED",
              phase: "BREAK",
              phaseStartedAt: null,
              endedAt: new Date(NOW + 2_000).toISOString(),
              actualFocusDurationSeconds: 300,
              actualBreakDurationSeconds: 2,
              version: 4,
            }),
          ),
        );
      }
      return Promise.resolve(response(404, {}));
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => ({ first: useFocusSession(), second: useFocusSession() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.first.remainingSeconds).toBe(1));
    vi.setSystemTime(NOW + 2_000);

    await waitFor(() => expect(completionCalls).toBe(1));
    await waitFor(() => {
      expect(result.current.first.terminalSession?.status).toBe("COMPLETED");
      expect(result.current.second.terminalSession?.status).toBe("COMPLETED");
    });
    expect(completionCalls).toBe(1);
  });
});
