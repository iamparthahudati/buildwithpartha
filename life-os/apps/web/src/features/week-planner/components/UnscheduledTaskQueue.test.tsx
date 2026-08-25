import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { WeekPlannerTask, WeeklyOutcome } from "../model/weekPlanner";
import { UnscheduledTaskQueue } from "./UnscheduledTaskQueue";

const DAYS = [
  { localDate: "2026-08-24", label: "Monday, 24 August" },
  { localDate: "2026-08-25", label: "Tuesday, 25 August" },
] as const;

const OUTCOMES: readonly WeeklyOutcome[] = [
  { id: "outcome-1", title: "Complete the weekly review", selected: true },
];

const TASKS: readonly WeekPlannerTask[] = [
  {
    id: "task-1",
    title: "Prepare weekly review",
    status: "TO_DO",
    priority: "P1",
    projectName: "Learning plan",
    estimateMinutes: 60,
  },
  {
    id: "task-2",
    title: "Organize tax documents",
    status: "BLOCKED",
    priority: "P2",
    projectName: "Home records cleanup",
    estimateMinutes: 90,
    isCarryOverCandidate: true,
  },
];

describe("UnscheduledTaskQueue", () => {
  it("filters the queue by search, Project, and priority", async () => {
    const { user } = renderWithUser(<UnscheduledTaskQueue tasks={TASKS} days={DAYS} />);

    await user.type(screen.getAllByLabelText("Search tasks")[0]!, "tax");
    expect(screen.queryAllByText("Prepare weekly review")).toHaveLength(0);
    expect(screen.getAllByText("Organize tax documents").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    await user.selectOptions(screen.getAllByLabelText("Project")[0]!, "Learning plan");
    await user.selectOptions(screen.getAllByLabelText("Priority")[0]!, "P1");
    expect(screen.getAllByText("Prepare weekly review").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Organize tax documents")).toHaveLength(0);
  });

  it("allocates a regular Task through the non-drag form", async () => {
    const onAllocateTask = vi.fn();
    const { user } = renderWithUser(
      <UnscheduledTaskQueue
        tasks={TASKS}
        days={DAYS}
        outcomes={OUTCOMES}
        onAllocateTask={onAllocateTask}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Allocate task" })[0]!);
    const dialog = screen.getByRole("dialog", { name: /Allocate task/ });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("Day")).toHaveFocus();
    await user.selectOptions(screen.getByLabelText("Day"), "2026-08-24");
    await user.click(within(dialog).getByRole("button", { name: "Allocate task" }));
    expect(onAllocateTask).toHaveBeenCalledWith("task-1", {
      localDate: "2026-08-24",
      outcomeId: null,
      plannedMinutes: 60,
    });
  });

  it("carries a previous-week candidate without silently allocating it", async () => {
    const onCarryTask = vi.fn();
    const { user } = renderWithUser(
      <UnscheduledTaskQueue
        tasks={TASKS}
        days={DAYS}
        onAllocateTask={vi.fn()}
        onCarryTask={onCarryTask}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Carry task" })[0]!);
    await user.click(
      within(screen.getByRole("dialog", { name: /Carry task/ })).getByRole("button", {
        name: "Carry task",
      }),
    );
    expect(onCarryTask).toHaveBeenCalledWith("task-2", {
      localDate: null,
      outcomeId: null,
      plannedMinutes: 90,
    });
  });

  it("keeps other Tasks available when one mutation fails", async () => {
    const onRetryTask = vi.fn();
    const tasks: readonly WeekPlannerTask[] = [
      TASKS[0]!,
      {
        ...TASKS[1]!,
        mutation: {
          type: "failed",
          message: "We couldn't carry this Task. Your selection is still here.",
        },
      },
    ];
    const { user } = renderWithUser(
      <UnscheduledTaskQueue tasks={tasks} days={DAYS} onRetryTask={onRetryTask} />,
    );

    expect(screen.getAllByText("Prepare weekly review").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("We couldn't carry this Task. Your selection is still here.").length,
    ).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: "Retry Organize tax documents" })[0]!);
    expect(onRetryTask).toHaveBeenCalledWith("task-2");
  });

  it("supports recoverable list failure and a truthful empty state", async () => {
    const onRetry = vi.fn();
    const { rerender, user } = renderWithUser(
      <UnscheduledTaskQueue
        tasks={[]}
        days={DAYS}
        error="Other Week Planner sections are still available."
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<UnscheduledTaskQueue tasks={[]} days={DAYS} />);
    expect(screen.getByText("No unscheduled tasks")).toBeInTheDocument();
    expect(screen.getByText("Tasks that still need a day will appear here.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <UnscheduledTaskQueue
        tasks={TASKS}
        days={DAYS}
        outcomes={OUTCOMES}
        onAllocateTask={vi.fn()}
        onCarryTask={vi.fn()}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
