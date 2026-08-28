import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { WeekPlannerTask, WeeklyOutcome } from "../model/weekPlanner";
import { TaskAllocationDialog } from "./TaskAllocationDialog";

const TASK: WeekPlannerTask = {
  id: "task-1",
  title: "Prepare weekly review",
  status: "TO_DO",
  priority: "P1",
  estimateMinutes: 60,
};

const DAYS = [
  { localDate: "2026-08-24", label: "Monday, 24 August" },
  { localDate: "2026-08-25", label: "Tuesday, 25 August" },
] as const;

const OUTCOMES: readonly WeeklyOutcome[] = [
  { id: "outcome-1", title: "Complete the weekly review", selected: true },
  { id: "outcome-2", title: "Deferred outcome", selected: false },
];

describe("TaskAllocationDialog", () => {
  it("allocates a Task to a day, outcome, and planned time", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(
      <TaskAllocationDialog
        open
        task={TASK}
        mode="allocate"
        days={DAYS}
        outcomes={OUTCOMES}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("Day")).toHaveFocus();
    await user.selectOptions(screen.getByLabelText("Day"), "2026-08-25");
    await user.selectOptions(screen.getByLabelText("Weekly outcome (optional)"), "outcome-1");
    await user.clear(screen.getByLabelText("Planned time"));
    await user.type(screen.getByLabelText("Planned time"), "90");
    await user.click(screen.getByRole("button", { name: "Allocate task" }));

    expect(onSubmit).toHaveBeenCalledWith(
      "task-1",
      { localDate: "2026-08-25", outcomeId: "outcome-1", plannedMinutes: 90 },
      "allocate",
    );
  });

  it("requires a day for allocation and preserves the entered time", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(
      <TaskAllocationDialog
        open
        task={TASK}
        mode="allocate"
        days={DAYS}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.clear(screen.getByLabelText("Planned time"));
    await user.type(screen.getByLabelText("Planned time"), "45");
    await user.click(screen.getByRole("button", { name: "Allocate task" }));
    expect(screen.getByText("Choose a day.")).toBeInTheDocument();
    expect(screen.getByLabelText("Planned time")).toHaveValue(45);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows a carry-over Task to remain explicitly unscheduled", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(
      <TaskAllocationDialog
        open
        task={TASK}
        mode="carry"
        days={DAYS}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Carry task" }));
    expect(onSubmit).toHaveBeenCalledWith(
      "task-1",
      { localDate: null, outcomeId: null, plannedMinutes: 60 },
      "carry",
    );
  });

  it("supports the same explicit form for moving a Task", () => {
    renderWithUser(
      <TaskAllocationDialog
        open
        task={TASK}
        mode="move"
        days={DAYS}
        initialValue={{ localDate: "2026-08-24", plannedMinutes: 60 }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: /Move task/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Day")).toHaveValue("2026-08-24");
    expect(screen.getByRole("button", { name: "Move task" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <TaskAllocationDialog
        open
        task={TASK}
        mode="allocate"
        days={DAYS}
        outcomes={OUTCOMES}
        error="We couldn't allocate this Task. Your choices are still here."
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
