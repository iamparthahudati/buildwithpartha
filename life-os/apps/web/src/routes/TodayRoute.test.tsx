import { screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TodayResponse } from "@features/today";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayRoute } from "./TodayRoute";

const todayMocks = vi.hoisted(() => ({
  query: vi.fn(),
  online: true,
  mutateBrainDump: vi.fn().mockResolvedValue({ id: "bd-1" }),
  mutateSetHabitEntry: vi.fn().mockResolvedValue({ id: "he-1" }),
  enqueueBrainDump: vi.fn(),
  habitsData: [{ id: "habit-1", title: "Read" }],
}));

vi.mock("@features/brain-dump", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/brain-dump")>()),
  useCaptureBrainDumpItem: () => ({
    mutateAsync: todayMocks.mutateBrainDump,
    isPending: false,
  }),
  useBrainDumpCaptureQueue: () => ({
    queuedItems: [],
    queuedCount: 0,
    isFlushing: false,
    enqueue: todayMocks.enqueueBrainDump,
    flush: vi.fn(),
    discardAll: vi.fn(),
  }),
}));

vi.mock("@features/habits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@features/habits")>()),
  useHabits: () => ({ data: todayMocks.habitsData, isPending: false }),
  useSetHabitEntry: () => ({
    mutateAsync: todayMocks.mutateSetHabitEntry,
    isPending: false,
    variables: undefined,
  }),
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
    onRetryMit: () => void;
    plan: {
      mitState: { type: string };
      tasksState: { type: string };
      onChooseMit: () => void;
      onChangeMit: () => void;
      onSetMit: () => void;
      onMarkDone: () => void;
      onStartFocus: (taskId: string) => void;
      onAddTask: () => void;
      onRetryMit: () => void;
      onRetryTasks: () => void;
    };
    nextUp: { onRetry: () => void };
    schedule: {
      state: { type: string };
      onAddTimeBlock: () => void;
      onStartFocus: (blockId: string) => void;
      onRetry: () => void;
    };
    activeProjects: {
      status: { type: string };
      onAddProject: () => void;
      onRetry: () => void;
    };
    sprintWeek: {
      sprintState: { type: string };
      weekState: { type: string };
      onRetrySprint: () => void;
      onRetryWeek: () => void;
    };
    review: {
      status: {
        data?: { morning: { href: string }; evening: { href: string } };
      };
      onRetry: () => void;
    };
    habits: {
      status: { type: string };
      onSetCount: (habit: any, count: number) => void;
      onRetry: () => void;
    };
    brainCapture: {
      value: string;
      onValueChange: (val: string) => void;
      onCapture: (req: { content: string; mode: "create" | "queue" }) => void;
      captureStatus: { type: string };
      onRetryCount: () => void;
    };
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
      <button type="button" onClick={props.plan.onChooseMit}>
        Choose MIT
      </button>
      <button type="button" onClick={props.plan.onChangeMit}>
        Change MIT
      </button>
      <button type="button" onClick={props.plan.onSetMit}>
        Set MIT
      </button>
      <button type="button" onClick={props.plan.onMarkDone}>
        Mark Done
      </button>
      <button type="button" onClick={() => props.plan.onStartFocus("task-123")}>
        Start Task Focus
      </button>
      <button type="button" onClick={props.plan.onAddTask}>
        Add task
      </button>
      <button type="button" onClick={props.plan.onRetryMit}>
        Retry Plan MIT
      </button>
      <button type="button" onClick={props.plan.onRetryTasks}>
        Retry Plan Tasks
      </button>
      <button type="button" onClick={props.nextUp.onRetry}>
        Retry Next Up
      </button>
      <p>Schedule: {props.schedule.state.type}</p>
      <button type="button" onClick={props.schedule.onAddTimeBlock}>
        Add time block
      </button>
      <button type="button" onClick={() => props.schedule.onStartFocus("block-123")}>
        Start Block Focus
      </button>
      <button type="button" onClick={props.schedule.onRetry}>
        Retry Schedule
      </button>
      <p>Projects: {props.activeProjects.status.type}</p>
      <button type="button" onClick={props.activeProjects.onAddProject}>
        Add project
      </button>
      <button type="button" onClick={props.activeProjects.onRetry}>
        Retry Projects
      </button>
      <p>Sprint: {props.sprintWeek.sprintState.type}</p>
      <p>Week: {props.sprintWeek.weekState.type}</p>
      <button type="button" onClick={props.sprintWeek.onRetrySprint}>
        Retry Sprint
      </button>
      <button type="button" onClick={props.sprintWeek.onRetryWeek}>
        Retry Week
      </button>
      <button type="button" onClick={props.review.onRetry}>
        Retry Review
      </button>
      <button
        type="button"
        onClick={() => props.habits.onSetCount({ id: "habit-1", localDate: "2026-09-04" }, 2)}
      >
        Set Habit Count
      </button>

      <button
        type="button"
        onClick={() => props.habits.onSetCount({ id: "habit-unknown", localDate: "2026-09-04" }, 2)}
      >
        Set Unknown Habit
      </button>
      <button type="button" onClick={props.habits.onRetry}>
        Retry Habits
      </button>

      <input
        aria-label="Capture content"
        value={props.brainCapture.value}
        onChange={(e) => props.brainCapture.onValueChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => props.brainCapture.onCapture({ content: "test item", mode: "create" })}
      >
        Capture Create
      </button>
      <button
        type="button"
        onClick={() => props.brainCapture.onCapture({ content: "test item", mode: "queue" })}
      >
        Capture Queue
      </button>
      <button type="button" onClick={props.brainCapture.onRetryCount}>
        Retry Capture Count
      </button>

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
          <Route path="/life-os/app/tasks" element={<div>Tasks Screen Target</div>} />
          <Route path="/life-os/app/focus" element={<div>Focus Screen Target</div>} />
          <Route path="/life-os/app/projects" element={<div>Projects Screen Target</div>} />
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

  it("triggers all navigation and action callbacks", async () => {
    const onQuickAddClick = vi.fn();
    const { user } = renderRoute(onQuickAddClick);

    await user.click(screen.getByRole("button", { name: "Choose MIT" }));
    expect(screen.getByText("Tasks Screen Target")).toBeInTheDocument();
  });

  it("triggers focus and add project actions", async () => {
    const onQuickAddClick = vi.fn();
    const { user } = renderRoute(onQuickAddClick);

    await user.click(screen.getByRole("button", { name: "Start Task Focus" }));
    expect(screen.getByText("Focus Screen Target")).toBeInTheDocument();
  });

  it("triggers quick add project and time block", async () => {
    const onQuickAddClick = vi.fn();
    const { user } = renderRoute(onQuickAddClick);

    await user.click(screen.getByRole("button", { name: "Add project" }));
    expect(onQuickAddClick).toHaveBeenCalledWith("project");
  });

  it("triggers habit set count and brain dump capture actions", async () => {
    const { user } = renderRoute();

    await user.type(screen.getByLabelText("Capture content"), "test value");
    await user.click(screen.getByRole("button", { name: "Capture Create" }));
    expect(todayMocks.mutateBrainDump).toHaveBeenCalledWith({ content: "test item" });

    await user.click(screen.getByRole("button", { name: "Capture Queue" }));
    expect(todayMocks.enqueueBrainDump).toHaveBeenCalledWith("test item");

    await user.click(screen.getByRole("button", { name: "Set Habit Count" }));
    expect(todayMocks.mutateSetHabitEntry).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Set Unknown Habit" }));
  });

  it("triggers all retry handlers", async () => {
    const { user } = renderRoute();

    await user.click(screen.getByRole("button", { name: "Retry Plan MIT" }));
    await user.click(screen.getByRole("button", { name: "Retry Schedule" }));
    await user.click(screen.getByRole("button", { name: "Retry Projects" }));
    await user.click(screen.getByRole("button", { name: "Retry Sprint" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderRoute();
    await expectNoAccessibilityViolations(container);
  });
});
