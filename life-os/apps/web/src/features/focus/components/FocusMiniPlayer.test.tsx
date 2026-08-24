import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { resetApiClientConfiguration } from "@lib/apiClient";

import { FocusMiniPlayer } from "./FocusMiniPlayer";

const BASE_NOW = Date.parse("2026-03-20T12:00:00.000Z");

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    ...(status === 204 ? {} : { headers: { "Content-Type": "application/json" } }),
  });
}

function requestUrl(input: string | URL | Request): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

const PREFS_BODY = {
  userId: "user-123",
  onboardingVersion: 1,
  onboardingStatus: "COMPLETED",
  lastCompletedStep: null,
  onboardingCompletedAt: null,
  planningDefaults: {
    workingDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "17:00",
    overnightSchedule: false,
    dailyFocusTargetMinutes: 120,
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
  },
};

function session(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const now = new Date(BASE_NOW).toISOString();
  return {
    id: "session-123",
    taskId: null,
    timeBlockId: null,
    status: "RUNNING",
    phase: "FOCUS",
    plannedFocusDurationSeconds: 1500,
    plannedBreakDurationSeconds: 300,
    actualFocusDurationSeconds: 0,
    actualBreakDurationSeconds: 0,
    startedAt: now,
    phaseStartedAt: now,
    pausedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    serverNow: now,
    version: 1,
    interruptions: [],
    ...overrides,
  };
}

function renderPlayer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider restoreSession={false}>
        <FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

function installFetch(active: Record<string, unknown> | null = null) {
  vi.mocked(fetch).mockImplementation((url) => {
    const path = requestUrl(url);
    if (path.endsWith("/user/preferences")) return Promise.resolve(jsonResponse(200, PREFS_BODY));
    if (path.endsWith("/focus-sessions/active")) {
      return Promise.resolve(active ? jsonResponse(200, active) : jsonResponse(204));
    }
    return Promise.resolve(jsonResponse(404, {}));
  });
}

describe("FocusMiniPlayer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.setSystemTime(BASE_NOW);
    localStorage.clear();
    installFetch();
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts with the LOS-0913 body and an idempotency key", async () => {
    vi.mocked(fetch).mockImplementation((url, init) => {
      const path = requestUrl(url);
      if (path.endsWith("/user/preferences")) return Promise.resolve(jsonResponse(200, PREFS_BODY));
      if (path.endsWith("/focus-sessions/active")) return Promise.resolve(jsonResponse(204));
      if (path.endsWith("/focus-sessions") && init?.method === "POST") {
        const headers = new Headers(init.headers);
        expect(headers.get("Idempotency-Key")).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
        expect(JSON.parse(String(init.body))).toEqual({
          plannedFocusDurationSeconds: 1500,
          plannedBreakDurationSeconds: 300,
        });
        return Promise.resolve(jsonResponse(201, session()));
      }
      return Promise.resolve(jsonResponse(404, {}));
    });

    const { user, container } = renderPlayer();
    await user.click(await screen.findByRole("button", { name: "Start focus" }));
    const desktop = container.querySelector<HTMLElement>(
      ".lifeos-focus-mini-player__desktop-only",
    )!;
    await user.click(within(desktop).getByRole("button", { name: "Start" }));
    await screen.findByRole("button", { name: /Focus session: 25:00 remaining/ });
  });

  it("restores server state and derives elapsed time after background sleep", async () => {
    installFetch(session({ actualFocusDurationSeconds: 30 }));
    renderPlayer();
    await screen.findByRole("button", { name: /Focus session: 24:30 remaining/ });

    vi.setSystemTime(BASE_NOW + 5_000);
    await screen.findByRole("button", { name: /Focus session: 24:25 remaining/ });
  });

  it("sends versioned pause and resume transitions for the canonical session id", async () => {
    installFetch(session());
    vi.mocked(fetch).mockImplementation((url, init) => {
      const path = requestUrl(url);
      if (path.endsWith("/user/preferences")) return Promise.resolve(jsonResponse(200, PREFS_BODY));
      if (path.endsWith("/focus-sessions/active"))
        return Promise.resolve(jsonResponse(200, session()));
      if (path.endsWith("/focus-sessions/session-123/pause")) {
        expect(JSON.parse(String(init?.body))).toEqual({ version: 1 });
        return Promise.resolve(
          jsonResponse(
            200,
            session({ status: "PAUSED", pausedAt: new Date(BASE_NOW).toISOString(), version: 2 }),
          ),
        );
      }
      if (path.endsWith("/focus-sessions/session-123/resume")) {
        expect(JSON.parse(String(init?.body))).toEqual({ version: 2 });
        return Promise.resolve(jsonResponse(200, session({ version: 3 })));
      }
      return Promise.resolve(jsonResponse(404, {}));
    });

    const { user, container } = renderPlayer();
    const trigger = await screen.findByRole("button", { name: /Focus session:/ });
    await user.click(trigger);
    const desktop = container.querySelector<HTMLElement>(
      ".lifeos-focus-mini-player__desktop-only",
    )!;
    await user.click(within(desktop).getByRole("button", { name: "Pause" }));
    await user.click(await within(desktop).findByRole("button", { name: "Resume" }));
    await within(desktop).findByRole("button", { name: "Pause" });
  });

  it("moves an expired focus phase to break only once", async () => {
    let startBreakCalls = 0;
    vi.mocked(fetch).mockImplementation((url) => {
      const path = requestUrl(url);
      if (path.endsWith("/user/preferences")) return Promise.resolve(jsonResponse(200, PREFS_BODY));
      if (path.endsWith("/focus-sessions/active")) {
        return Promise.resolve(jsonResponse(200, session({ plannedFocusDurationSeconds: 1 })));
      }
      if (path.endsWith("/focus-sessions/session-123/start-break")) {
        startBreakCalls += 1;
        return Promise.resolve(
          jsonResponse(200, session({ phase: "BREAK", actualFocusDurationSeconds: 1, version: 2 })),
        );
      }
      return Promise.resolve(jsonResponse(404, {}));
    });

    renderPlayer();
    await screen.findByRole("button", { name: /Focus session: 0:01 remaining/ });
    vi.setSystemTime(BASE_NOW + 2_000);
    await waitFor(() => expect(startBreakCalls).toBe(1));
    await screen.findByRole("button", { name: /Focus session: 5:00 remaining/ });
    expect(startBreakCalls).toBe(1);
  });

  it("does not persist or fabricate a Focus Session when a write is unavailable", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      const path = requestUrl(url);
      if (path.endsWith("/user/preferences")) return Promise.resolve(jsonResponse(200, PREFS_BODY));
      if (path.endsWith("/focus-sessions/active")) return Promise.resolve(jsonResponse(204));
      return Promise.reject(new TypeError("offline"));
    });

    const { user, container } = renderPlayer();
    await user.click(await screen.findByRole("button", { name: "Start focus" }));
    const desktop = container.querySelector<HTMLElement>(
      ".lifeos-focus-mini-player__desktop-only",
    )!;
    await user.click(within(desktop).getByRole("button", { name: "Start" }));
    await screen.findByText(/no change was confirmed/i);
    expect(localStorage.length).toBe(0);
    expect(screen.getByRole("button", { name: "Start focus" })).toBeInTheDocument();
  });

  it("closes with Escape and passes an accessibility sweep", async () => {
    const { user, container } = renderPlayer();
    await expectNoAccessibilityViolations(container);
    await user.click(await screen.findByRole("button", { name: "Start focus" }));
    await expectNoAccessibilityViolations(container);
    fireEvent.keyDown(document, { key: "Escape" });
    const desktop = container.querySelector<HTMLElement>(
      ".lifeos-focus-mini-player__desktop-only",
    )!;
    expect(within(desktop).queryByText("Start Focus Session")).not.toBeInTheDocument();
  });
});
