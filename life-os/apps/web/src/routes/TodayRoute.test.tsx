import { screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TodayResponse } from "@features/today";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayRoute } from "./TodayRoute";

/**
 * TodayRoute (LOS-0615).
 *
 * Route tests mock all dependencies at module level following the same
 * `SettingsRoute.test.tsx` pattern — no local helper components are declared
 * inside a routes/ file (the boundary verifier enforces that routes/ files
 * may only export *Route composition components).
 */

const todayMocks = vi.hoisted(() => ({
  query: vi.fn(),
  online: true,
}));

vi.mock("@features/brain-dump", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/brain-dump")>()),
  useCaptureBrainDumpItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBrainDumpCaptureQueue: () => ({
    queuedItems: [],
    queuedCount: 0,
    isFlushing: false,
    enqueue: vi.fn(),
    flush: vi.fn(),
    discardAll: vi.fn(),
  }),
}));

vi.mock("@features/habits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/habits")>()),
  useHabits: () => ({ data: [], isPending: false }),
  useSetHabitEntry: () => ({ mutateAsync: vi.fn(), isPending: false, variables: undefined }),
}));

vi.mock("@features/today", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/today")>()),
  useToday: todayMocks.query,
  useTodayOnlineStatus: () => todayMocks.online,
  TodayScreen: (props: {
    displayName: string;
    timeZone: string;
    locale: string;
    subtitle: string;
    onQuickAddClick: () => void;
    mitStatus: { message?: string };
    tasksStatus: { message?: string };
    scheduledTimeStatus: { message?: string };
    focusTimeStatus: { message?: string };
    activeProjectsStatus: { message?: string };
    weekProgressStatus: { message?: string };
    plan: { mitState: { type: string }; tasksState: { type: string }; onAddTask: () => void };
    schedule: { state: { type: string }; onAddTimeBlock: () => void };
    activeProjects: { status: { type: string } };
    sprintWeek: { sprintState: { type: string }; weekState: { type: string } };
    review: {
      status: {
        data: { morning: { href: string }; evening: { href: string } };
      };
    };
    brainCapture: { captureStatus: { type: string } };
    connectionState: { type: string; lastUpdatedLabel?: string };
    planningState: { type: string };
  }) => (
    <div data-testid="today-screen">
      <p>displayName: {props.displayName}</p>
      <p>timeZone: {props.timeZone}</p>
      <p>locale: {props.locale}</p>
      <p>{props.subtitle}</p>
      <p>{props.mitStatus.message}</p>
      <p>{props.tasksStatus.message}</p>
      <p>{props.scheduledTimeStatus.message}</p>
      <p>{props.focusTimeStatus.message}</p>
      <p>{props.activeProjectsStatus.message}</p>
      <p>{props.weekProgressStatus.message}</p>
      <button type="button" onClick={props.onQuickAddClick}>
        Quick Add
      </button>
      <p>MIT: {props.plan.mitState.type}</p>
      <p>Tasks: {props.plan.tasksState.type}</p>
      <button type="button" onClick={props.plan.onAddTask}>
        Add task
      </button>
      <p>Schedule: {props.schedule.state.type}</p>
      <button type="button" onClick={props.schedule.onAddTimeBlock}>
        Add time block
      </button>
      <p>Projects: {props.activeProjects.status.type}</p>
      <p>Sprint: {props.sprintWeek.sprintState.type}</p>
      <p>Week: {props.sprintWeek.weekState.type}</p>
      {props.review.status.data ? (
        <>
          <p>Morning review: {props.review.status.data.morning.href}</p>
          <p>Evening review: {props.review.status.data.evening.href}</p>
        </>
      ) : null}
      <p>Capture: {props.brainCapture.captureStatus.type}</p>
      <p>Connection: {props.connectionState.type}</p>
      <p>Planning: {props.planningState.type}</p>
    </div>
  ),
}));

const emptyWidget = <T,>(data: T) => ({ status: "EMPTY" as const, data, error: null });

const foundationResponse: TodayResponse = {
  generatedAt: "2026-08-20T04:30:00.000Z",
  userTimeZone: "Asia/Kolkata",
  localDate: "2026-08-20",
  mit: emptyWidget(null),
  currentNextBlock: emptyWidget(null),
  tasks: emptyWidget({ tasks: [] }),
  schedule: emptyWidget({ blocks: [], conflicts: [] }),
  overdue: emptyWidget({ totalCount: 0, topOverdueTasks: [] }),
  focusSummary: emptyWidget({
    actualFocusMinutesToday: 0,
    plannedFocusMinutesToday: 0,
    activeSessionTimerSummary: null,
    isSessionActive: false,
  }),
  sprint: emptyWidget(null),
  week: emptyWidget({ completedTasksCount: 0, totalTasksCount: 0, outcomes: [] }),
  activeProjects: emptyWidget({ projects: [] }),
  review: emptyWidget({
    morningReviewCompleted: false,
    eveningReviewCompleted: false,
    morningReviewState: "NOT_STARTED",
    eveningReviewState: "NOT_STARTED",
  }),
  brainDump: emptyWidget({ unprocessedCount: 0 }),
  habits: emptyWidget({ habits: [] }),
  metrics: emptyWidget({ metrics: [] }),
};

const refetch = vi.fn();

vi.mock("@state/authSession", () => ({
  useAuthSession: () => ({
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "account@example.test",
      displayName: "Partha",
      timeZone: "Asia/Kolkata",
      locale: "en-IN",
      weekStart: 1,
    },
    csrfToken: "test-token",
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }),
}));

function renderRoute(onQuickAddClick = vi.fn()) {
  return renderWithUser(
    <MemoryRouter>
      <Routes>
        <Route element={<Outlet context={{ onQuickAddClick }} />}>
          <Route index element={<TodayRoute />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("TodayRoute", () => {
  beforeEach(() => {
    todayMocks.online = true;
    refetch.mockReset();
    todayMocks.query.mockReturnValue({
      data: foundationResponse,
      isPending: false,
      refetch,
    });
  });

  it("renders TodayScreen with the authenticated user's identity", () => {
    renderRoute();

    expect(screen.getByTestId("today-screen")).toBeInTheDocument();
    expect(screen.getByText("displayName: Partha")).toBeInTheDocument();
    expect(screen.getByText("timeZone: Asia/Kolkata")).toBeInTheDocument();
    expect(screen.getByText("locale: en-IN")).toBeInTheDocument();
  });

  it("renders the approved Today helper and honest foundation empty states", () => {
    renderRoute();

    expect(
      screen.getByText("See what needs attention and choose what to do next."),
    ).toBeInTheDocument();
    expect(screen.getByText("No focus chosen yet.")).toBeInTheDocument();
    expect(screen.getByText("No tasks planned for today.")).toBeInTheDocument();
    expect(screen.getByText("No Time Blocks scheduled today.")).toBeInTheDocument();
    expect(screen.getByText("No focus time recorded today.")).toBeInTheDocument();
    expect(screen.getByText("No active projects yet.")).toBeInTheDocument();
    expect(screen.getByText("No Weekly Plan yet.")).toBeInTheDocument();
    expect(screen.getByText("MIT: empty")).toBeInTheDocument();
    expect(screen.getByText("Tasks: empty")).toBeInTheDocument();
    expect(screen.getByText("Schedule: empty")).toBeInTheDocument();
    expect(screen.getByText("Projects: empty")).toBeInTheDocument();
    expect(screen.getByText("Sprint: empty")).toBeInTheDocument();
    expect(screen.getByText("Week: empty")).toBeInTheDocument();
    expect(screen.getByText("Capture: idle")).toBeInTheDocument();
    expect(screen.getByText("Connection: online")).toBeInTheDocument();
    expect(
      screen.getAllByText(/review: \/life-os\/app\/reviews\/daily\/\d{4}-\d{2}-\d{2}/i),
    ).toHaveLength(2);
  });

  it("opens the shell-owned Quick Add dialog from the header trigger", async () => {
    const onQuickAddClick = vi.fn();
    const { user } = renderRoute(onQuickAddClick);

    await user.click(screen.getByRole("button", { name: "Quick Add" }));
    await user.click(screen.getByRole("button", { name: "Add task" }));
    await user.click(screen.getByRole("button", { name: "Add time block" }));
    expect(onQuickAddClick).toHaveBeenCalledTimes(3);
    expect(onQuickAddClick).toHaveBeenNthCalledWith(1);
    expect(onQuickAddClick).toHaveBeenNthCalledWith(2, "task");
    expect(onQuickAddClick).toHaveBeenNthCalledWith(3, "time-block");
  });

  it("renders the route's own container element", () => {
    const { container } = renderRoute();
    expect(container.querySelector(".lifeos-today-route")).toBeInTheDocument();
  });

  it("preserves endpoint partial failures and exposes a retry", async () => {
    todayMocks.query.mockReturnValue({
      data: {
        ...foundationResponse,
        tasks: { status: "ERROR", data: null, error: "Provider execution failed" },
      },
      isPending: false,
      refetch,
    });

    renderRoute();

    expect(screen.getByText("MIT: empty")).toBeInTheDocument();
    expect(screen.getByText("Tasks: error")).toBeInTheDocument();
    expect(screen.getByText("Schedule: empty")).toBeInTheDocument();
  });

  it("labels cached data with its generated time when the browser goes offline", () => {
    todayMocks.online = false;

    renderRoute();

    expect(screen.getByText("Connection: offline")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderRoute();
    await expectNoAccessibilityViolations(container);
  });
});
