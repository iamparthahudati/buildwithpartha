import { describe, expect, it } from "vitest";

import type { TodayResponse, TodayWidget } from "../api/todayApi";
import {
  createErrorTodayViewModel,
  createLoadingTodayViewModel,
  formatTodayLastUpdated,
  mapTodayResponse,
} from "./todayViewModel";

function widget<T>(status: TodayWidget<T>["status"], data: T | null): TodayWidget<T> {
  return { status, data, error: status === "ERROR" ? "Provider execution failed" : null };
}

function emptyWidget<T>(): TodayWidget<T> {
  return widget<T>("EMPTY", null);
}

function errorWidget<T>(): TodayWidget<T> {
  return widget<T>("ERROR", null);
}

function emptyResponse(): TodayResponse {
  return {
    generatedAt: "2026-08-20T04:30:00.000Z",
    userTimeZone: "Asia/Kolkata",
    localDate: "2026-08-20",
    mit: emptyWidget(),
    currentNextBlock: emptyWidget(),
    tasks: widget("EMPTY", { tasks: [] }),
    schedule: widget("EMPTY", { blocks: [], conflicts: [] }),
    overdue: widget("EMPTY", { totalCount: 0, topOverdueTasks: [] }),
    focusSummary: widget("EMPTY", {
      actualFocusMinutesToday: 0,
      plannedFocusMinutesToday: 0,
      activeSessionTimerSummary: null,
      isSessionActive: false,
    }),
    sprint: emptyWidget(),
    week: widget("EMPTY", { completedTasksCount: 0, totalTasksCount: 0, outcomes: [] }),
    activeProjects: widget("EMPTY", { projects: [] }),
    review: widget("EMPTY", {
      morningReviewCompleted: false,
      eveningReviewCompleted: false,
      morningReviewState: "NOT_STARTED",
      eveningReviewState: "NOT_STARTED",
    }),
    brainDump: widget("EMPTY", { unprocessedCount: 0 }),
    habits: widget("EMPTY", { habits: [] }),
    metrics: widget("EMPTY", { metrics: [] }),
  };
}

function populatedResponse(): TodayResponse {
  const base = emptyResponse();
  const project = {
    projectId: "project/launch",
    projectName: "Website launch",
    projectColor: null,
  };
  const task = {
    id: "task-outline",
    title: "Draft launch outline",
    ...project,
    priority: "P1",
    dueDate: "2026-08-20",
    completed: false,
    isOverdue: false,
    status: "IN_PROGRESS",
  } as const;
  const block = {
    id: "block-deep-work",
    title: "Deep work",
    startTime: "10:00",
    endTime: "11:30",
    category: "Focused work",
    projectId: project.projectId,
    projectName: project.projectName,
    completed: false,
  } as const;

  return {
    ...base,
    mit: widget("SUCCESS", {
      taskId: task.id,
      title: task.title,
      ...project,
      priority: task.priority,
      dueDate: task.dueDate,
      completed: false,
      focusActive: true,
    }),
    currentNextBlock: widget("SUCCESS", { current: block, next: null }),
    tasks: widget("SUCCESS", {
      tasks: [
        task,
        {
          ...task,
          id: "task-review",
          title: "Review copy",
          priority: "P2",
          dueDate: "2026-08-21",
          status: "TO_DO",
        },
      ],
    }),
    schedule: widget("SUCCESS", {
      blocks: [block],
      conflicts: [
        {
          firstBlockId: block.id,
          secondBlockId: "block-meeting",
          description: "This Time Block overlaps another reservation.",
        },
      ],
    }),
    focusSummary: widget("SUCCESS", {
      actualFocusMinutesToday: 45,
      plannedFocusMinutesToday: 90,
      activeSessionTimerSummary: "25:00",
      isSessionActive: true,
    }),
    sprint: widget("SUCCESS", {
      sprintId: "sprint-august",
      name: "August focus",
      completedStoryPoints: 5,
      totalStoryPoints: 8,
      startDate: "2026-08-17",
      endDate: "2026-08-30",
    }),
    week: widget("SUCCESS", {
      completedTasksCount: 5,
      totalTasksCount: 8,
      outcomes: [{ id: "goal-1", title: "Ship the page", completed: false }],
      startDate: "2026-08-17",
      endDate: "2026-08-23",
      days: [{ localDate: "2026-08-20", completedTasksCount: 1, totalTasksCount: 2 }],
      plannedMinutes: 600,
      capacityMinutes: 480,
    }),
    activeProjects: widget("SUCCESS", {
      projects: [
        {
          id: project.projectId,
          name: project.projectName,
          color: null,
          completedTasksCount: 3,
          totalTasksCount: 6,
          status: "ACTIVE",
        },
      ],
    }),
    review: widget("SUCCESS", {
      morningReviewCompleted: true,
      eveningReviewCompleted: false,
      morningReviewState: "COMPLETED",
      eveningReviewState: "IN_PROGRESS",
    }),
    brainDump: widget("SUCCESS", { unprocessedCount: 3 }),
    metrics: widget("SUCCESS", {
      metrics: [
        {
          key: "focus_time",
          label: "Focus time",
          value: "45",
          unit: "min",
          trend: null,
          status: null,
        },
      ],
    }),
  };
}

describe("todayViewModel", () => {
  it("maps the foundation payload to truthful first-use states", () => {
    const view = mapTodayResponse(emptyResponse(), "en-IN");

    expect(view.mitStatus).toEqual({ type: "empty", message: "No focus chosen yet." });
    expect(view.plan).toEqual({ mitState: { type: "empty" }, tasksState: { type: "empty" } });
    expect(view.scheduleState).toEqual({ type: "empty" });
    expect(view.sprintState).toEqual({ type: "empty" });
    expect(view.weekState).toEqual({ type: "empty" });
    expect(view.projectsStatus).toEqual({ type: "empty" });
    expect(view.brainDumpCountStatus).toEqual({ type: "ready", unprocessedCount: 0 });
    expect(view.reviewStatus.type).toBe("ready");
  });

  it("maps populated providers without changing the composed screen contract", () => {
    const view = mapTodayResponse(
      populatedResponse(),
      "en-IN",
      new Date("2026-08-20T04:30:00.000Z"),
    );

    expect(view.plan.mitState).toMatchObject({
      type: "ready",
      task: {
        id: "task-outline",
        status: "IN_PROGRESS",
        dueLabel: "Due today, 20 Aug 2026",
        disabledActions: ["set-mit", "mark-done", "start-focus"],
      },
    });
    expect(view.plan.tasksState.type).toBe("ready");
    if (view.plan.tasksState.type === "ready") {
      expect(view.plan.tasksState.tasks[0]).toMatchObject({ isMit: true });
    }
    expect(view.nextUpStatus).toEqual({ type: "hidden" });
    expect(view.scheduleState).toMatchObject({
      type: "ready",
      blocks: [
        {
          id: "block-deep-work",
          state: "current",
          conflictDescriptions: ["This Time Block overlaps another reservation."],
        },
      ],
    });
    expect(view.scheduledTimeStatus).toEqual({ type: "ready", value: "1 hr 30 mins" });
    expect(view.focusTimeStatus).toEqual({ type: "ready", value: "45 min" });
    expect(view.weekProgressStatus).toEqual({ type: "ready", value: "5 of 8" });
    expect(view.projectsStatus).toMatchObject({
      type: "ready",
      projects: [{ name: "Website launch" }],
    });
    expect(view.sprintState).toMatchObject({ type: "ready", sprint: { name: "August focus" } });
    expect(view.weekState).toMatchObject({
      type: "ready",
      week: { days: [{ localDate: "2026-08-20", isToday: true }] },
    });
    expect(view.reviewStatus).toMatchObject({
      type: "ready",
      data: { morning: { state: "FINALIZED" }, evening: { state: "DRAFT" } },
    });
    expect(view.brainDumpCountStatus).toEqual({ type: "ready", unprocessedCount: 3 });
    expect(view.planningState).toEqual({
      type: "overloaded",
      reviewPlanHref: "/life-os/app/week-planner",
    });
  });

  it("derives a deterministic Next up only when the MIT no longer hides it", () => {
    const response = populatedResponse();
    const view = mapTodayResponse(
      {
        ...response,
        mit: widget("SUCCESS", { ...response.mit.data!, completed: true, focusActive: false }),
        tasks: widget("SUCCESS", {
          tasks: [
            ...(response.tasks.data?.tasks ?? []),
            {
              ...(response.tasks.data?.tasks[0])!,
              id: "task-high-priority",
              title: "Handle launch risk",
              priority: "P1",
              dueDate: "2026-08-19",
              isOverdue: true,
            },
          ],
        }),
      },
      "en-IN",
    );

    expect(view.nextUpStatus).toMatchObject({
      type: "ready",
      availability: "focus-completed",
      task: { id: "task-high-priority", timingLabel: "Overdue, 19 Aug 2026" },
      rankingExplanation: "P1 priority; overdue, 19 aug 2026.",
    });
  });

  it("labels the daily focus target when no explicit focus plan exists", () => {
    const response = populatedResponse();
    const view = mapTodayResponse(
      {
        ...response,
        focusSummary: widget("SUCCESS", {
          actualFocusMinutesToday: 30,
          plannedFocusMinutesToday: 0,
          activeSessionTimerSummary: null,
          isSessionActive: false,
          dailyFocusTargetMinutes: 60,
          comparisonMinutes: 60,
          comparisonSource: "DAILY_TARGET",
          progressPercentage: 50,
        }),
        metrics: widget("EMPTY", { metrics: [] }),
      },
      "en-IN",
    );

    expect(view.focusTimeStatus).toEqual({
      type: "ready",
      value: "30 mins of 1 hr daily target",
    });
  });

  it("keeps provider failures isolated and never exposes backend error text", () => {
    const response = populatedResponse();
    const view = mapTodayResponse(
      {
        ...response,
        tasks: errorWidget(),
        activeProjects: errorWidget(),
      },
      "en-IN",
    );

    expect(view.plan.mitState.type).toBe("ready");
    expect(view.plan.tasksState).toEqual({
      type: "error",
      message: "Other Today sections are still available. Try this section again.",
    });
    expect(view.scheduleState.type).toBe("ready");
    expect(view.projectsStatus).toMatchObject({ type: "error" });
    expect(JSON.stringify(view)).not.toContain("Provider execution failed");
  });

  it("provides complete initial loading and aggregate-error states", () => {
    expect(createLoadingTodayViewModel()).toMatchObject({
      mitStatus: { type: "loading" },
      plan: { mitState: { type: "loading" }, tasksState: { type: "loading" } },
      reviewStatus: { type: "loading" },
    });
    expect(createErrorTodayViewModel()).toMatchObject({
      mitStatus: { type: "error" },
      plan: { mitState: { type: "error" }, tasksState: { type: "error" } },
      reviewStatus: { type: "error" },
    });
  });

  it("formats generated-at freshness in the response timezone", () => {
    expect(formatTodayLastUpdated("2026-08-20T04:30:00Z", "en-IN", "Asia/Kolkata")).toContain(
      "10:00",
    );
    expect(formatTodayLastUpdated("invalid", "en-IN", "Asia/Kolkata")).toBe("an earlier update");
  });
});
