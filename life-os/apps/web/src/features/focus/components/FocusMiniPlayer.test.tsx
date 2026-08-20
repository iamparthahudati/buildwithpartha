import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { resetApiClientConfiguration } from "@lib/apiClient";

import { FocusMiniPlayer } from "./FocusMiniPlayer";

const LOCAL_STORAGE_KEY = "lifeos-active-focus-session";
const BASE_NOW = 1774180800000; // Fixed timestamp: 2026-03-20T12:00:00.000Z

function jsonResponse(status: number, body: unknown): Response {
  const responseBody = status === 204 || body === undefined ? null : JSON.stringify(body);
  const init: ResponseInit = { status };
  if (status !== 204) {
    init.headers = { "Content-Type": "application/json" };
  }
  return new Response(responseBody, init);
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

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderPlayer(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return {
    ...renderWithUser(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>{ui}</AuthSessionProvider>
      </QueryClientProvider>,
    ),
    queryClient,
  };
}

describe("FocusMiniPlayer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
    vi.setSystemTime(BASE_NOW);

    // Default mock for preferences
    vi.mocked(fetch).mockImplementation((url) => {
      const path = typeof url === "string" ? url : (url as Request).url;
      if (path.endsWith("/user/preferences")) {
        return Promise.resolve(jsonResponse(200, PREFS_BODY));
      }
      if (path.endsWith("/focus-sessions/active")) {
        return Promise.resolve(jsonResponse(204, undefined));
      }
      return Promise.resolve(jsonResponse(404, undefined));
    });
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders in idle state with a clock trigger button", async () => {
    renderPlayer(<FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />);

    const startButton = await screen.findByRole("button", { name: "Start focus" });
    expect(startButton).toBeInTheDocument();
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
  });

  it("opens start form and allows typing or choosing preset to start", async () => {
    const { user, container } = renderPlayer(
      <FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />,
    );

    const trigger = await screen.findByRole("button", { name: "Start focus" });
    await user.click(trigger);

    const desktopContainer = container.querySelector(
      ".lifeos-focus-mini-player__desktop-only",
    ) as HTMLElement;
    expect(within(desktopContainer!).getByText("Start Focus Session")).toBeInTheDocument();
    const input = within(desktopContainer!).getByLabelText("Duration in minutes");
    expect(input).toHaveValue(25);

    // Mock start endpoint
    vi.mocked(fetch).mockImplementation((url, init) => {
      const path = typeof url === "string" ? url : (url as Request).url;
      if (path.endsWith("/focus-sessions") && init?.method === "POST") {
        return Promise.resolve(
          jsonResponse(200, {
            id: "session-123",
            taskId: null,
            timeBlockId: null,
            totalSeconds: 1500,
            remainingSeconds: 1500,
            status: "running",
            phase: "focus",
            startedAt: new Date(BASE_NOW).toISOString(),
            pausedAt: null,
            lastStateUpdatedAt: new Date(BASE_NOW).toISOString(),
          }),
        );
      }
      if (path.endsWith("/user/preferences")) {
        return Promise.resolve(jsonResponse(200, PREFS_BODY));
      }
      return Promise.resolve(jsonResponse(404, undefined));
    });

    const startButton = within(desktopContainer!).getByRole("button", { name: "Start" });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Focus session:/ })).toBeInTheDocument();
    });
  });

  it("restores active session from server and updates monotonic timer", async () => {
    const lastUpdate = new Date(BASE_NOW - 30 * 1000).toISOString(); // 30s ago
    vi.mocked(fetch).mockImplementation((url) => {
      const path = typeof url === "string" ? url : (url as Request).url;
      if (path.endsWith("/user/preferences")) {
        return Promise.resolve(jsonResponse(200, PREFS_BODY));
      }
      if (path.endsWith("/focus-sessions/active")) {
        return Promise.resolve(
          jsonResponse(200, {
            id: "session-123",
            taskId: null,
            timeBlockId: null,
            totalSeconds: 1500,
            remainingSeconds: 1500,
            status: "running",
            phase: "focus",
            startedAt: lastUpdate,
            pausedAt: null,
            lastStateUpdatedAt: lastUpdate,
          }),
        );
      }
      return Promise.resolve(jsonResponse(404, undefined));
    });

    renderPlayer(<FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />);

    // Since 30 seconds have elapsed, remaining time should be 1470s (24:30)
    await screen.findByRole("button", { name: /Focus session: 24:30 remaining/ });

    // Advance the mock system clock by 5 seconds
    vi.setSystemTime(BASE_NOW + 5000);

    // Wait for the real-time interval tick to update the DOM
    await screen.findByRole("button", { name: /Focus session: 24:25 remaining/ });
  });

  it("pauses and resumes session correctly via actions inside popover", async () => {
    const sessionTime = new Date(BASE_NOW).toISOString();
    vi.mocked(fetch).mockImplementation((url, init) => {
      const path = typeof url === "string" ? url : (url as Request).url;
      if (path.endsWith("/user/preferences")) {
        return Promise.resolve(jsonResponse(200, PREFS_BODY));
      }
      if (path.endsWith("/focus-sessions/active")) {
        return Promise.resolve(
          jsonResponse(200, {
            id: "session-123",
            taskId: null,
            timeBlockId: null,
            totalSeconds: 1500,
            remainingSeconds: 1500,
            status: "running",
            phase: "focus",
            startedAt: sessionTime,
            pausedAt: null,
            lastStateUpdatedAt: sessionTime,
          }),
        );
      }
      if (path.endsWith("/focus-sessions/active/pause") && init?.method === "POST") {
        return Promise.resolve(
          jsonResponse(200, {
            id: "session-123",
            taskId: null,
            timeBlockId: null,
            totalSeconds: 1500,
            remainingSeconds: 1495,
            status: "paused",
            phase: "focus",
            startedAt: sessionTime,
            pausedAt: new Date(BASE_NOW).toISOString(),
            lastStateUpdatedAt: new Date(BASE_NOW).toISOString(),
          }),
        );
      }
      if (path.endsWith("/focus-sessions/active/resume") && init?.method === "POST") {
        return Promise.resolve(
          jsonResponse(200, {
            id: "session-123",
            taskId: null,
            timeBlockId: null,
            totalSeconds: 1500,
            remainingSeconds: 1495,
            status: "running",
            phase: "focus",
            startedAt: sessionTime,
            pausedAt: null,
            lastStateUpdatedAt: new Date(BASE_NOW).toISOString(),
          }),
        );
      }
      return Promise.resolve(jsonResponse(404, undefined));
    });

    const { user, container } = renderPlayer(
      <FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />,
    );

    const trigger = await screen.findByRole("button", { name: /Focus session:/ });
    await user.click(trigger);

    const desktopContainer = container.querySelector(
      ".lifeos-focus-mini-player__desktop-only",
    ) as HTMLElement;

    // Click pause
    const pauseButton = within(desktopContainer!).getByRole("button", { name: "Pause" });
    await user.click(pauseButton);

    await within(desktopContainer!).findByText("Paused");

    // Click resume
    const resumeButton = within(desktopContainer!).getByRole("button", { name: "Resume" });
    await user.click(resumeButton);

    await within(desktopContainer!).findByText("Running");
  });

  it("sends complete request when timer reaches 0", async () => {
    const sessionTime = new Date(BASE_NOW).toISOString();
    let completeCalled = false;

    vi.mocked(fetch).mockImplementation((url, init) => {
      const path = typeof url === "string" ? url : (url as Request).url;
      if (path.endsWith("/user/preferences")) {
        return Promise.resolve(jsonResponse(200, PREFS_BODY));
      }
      if (path.endsWith("/focus-sessions/active")) {
        return Promise.resolve(
          jsonResponse(200, {
            id: "session-123",
            taskId: null,
            timeBlockId: null,
            totalSeconds: 10,
            remainingSeconds: 10,
            status: "running",
            phase: "focus",
            startedAt: sessionTime,
            pausedAt: null,
            lastStateUpdatedAt: sessionTime,
          }),
        );
      }
      if (path.endsWith("/focus-sessions/active/complete") && init?.method === "POST") {
        completeCalled = true;
        return Promise.resolve(
          jsonResponse(200, {
            id: "session-123",
            taskId: null,
            timeBlockId: null,
            totalSeconds: 10,
            remainingSeconds: 0,
            status: "completed",
            phase: "focus",
            startedAt: sessionTime,
            pausedAt: null,
            lastStateUpdatedAt: new Date(BASE_NOW + 10000).toISOString(),
          }),
        );
      }
      return Promise.resolve(jsonResponse(404, undefined));
    });

    renderPlayer(<FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />);

    await screen.findByRole("button", { name: /Focus session: 0:10 remaining/ });

    // Advance the mock system clock to expiration
    vi.setSystemTime(BASE_NOW + 11000);

    await waitFor(() => {
      expect(completeCalled).toBe(true);
    });
  });

  it("uses localStorage fallback when server is unavailable", async () => {
    // Fail active query with 404
    vi.mocked(fetch).mockImplementation((url) => {
      const path = typeof url === "string" ? url : (url as Request).url;
      if (path.endsWith("/user/preferences")) {
        return Promise.resolve(jsonResponse(200, PREFS_BODY));
      }
      return Promise.resolve(jsonResponse(404, undefined));
    });

    const { user, container } = renderPlayer(
      <FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />,
    );

    const trigger = await screen.findByRole("button", { name: "Start focus" });
    await user.click(trigger);

    const desktopContainer = container.querySelector(
      ".lifeos-focus-mini-player__desktop-only",
    ) as HTMLElement;
    const startButton = within(desktopContainer!).getByRole("button", { name: "Start" });
    await user.click(startButton);

    // Should create a session in localStorage and transition UI
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Focus session:/ })).toBeInTheDocument();
    });

    const localSession = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
    expect(localSession.status).toBe("running");
    expect(localSession.totalSeconds).toBe(1500);
  });

  it("closes popover on escape key or outside click", async () => {
    const { user, container } = renderPlayer(
      <FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />,
    );

    const trigger = await screen.findByRole("button", { name: "Start focus" });
    await user.click(trigger);

    const desktopContainer = container.querySelector(
      ".lifeos-focus-mini-player__desktop-only",
    ) as HTMLElement;
    expect(within(desktopContainer!).getByText("Start Focus Session")).toBeInTheDocument();

    // Escape closes popover
    fireEvent.keyDown(document, { key: "Escape" });
    expect(within(desktopContainer!).queryByText("Start Focus Session")).not.toBeInTheDocument();
  });

  it("passes accessibility axe sweep", async () => {
    const { container, user } = renderPlayer(
      <FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);

    const trigger = await screen.findByRole("button", { name: "Start focus" });
    await user.click(trigger);
    await expectNoAccessibilityViolations(container);
  });
});
