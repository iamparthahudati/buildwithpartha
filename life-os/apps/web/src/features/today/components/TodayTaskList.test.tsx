import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TodayPlanTask } from "../model/todayPlan";
import { TodayTaskList, type TodayTaskListProps } from "./TodayTaskList";

const TASKS: readonly TodayPlanTask[] = [
  {
    id: "task-1",
    title: "Prepare weekly review",
    href: "/life-os/app/tasks/task-1",
    priority: "P1",
    status: "IN_PROGRESS",
    project: { name: "Learning plan", href: "/life-os/app/projects/project-1" },
    dueLabel: "Due today, 20 Aug 2026",
    isMit: true,
  },
  {
    id: "task-2",
    title: "Organize tax documents",
    href: "/life-os/app/tasks/task-2",
    priority: "P3",
    status: "TO_DO",
  },
  {
    id: "task-3",
    title: "Compare hosting options",
    href: "/life-os/app/tasks/task-3",
    priority: "P2",
    status: "DONE",
    project: { name: "Portfolio refresh" },
  },
];

function props(overrides: Partial<TodayTaskListProps> = {}): TodayTaskListProps {
  return {
    state: { type: "ready", tasks: TASKS },
    tasksHref: "/life-os/app/tasks",
    onAddTask: vi.fn(),
    onSetMit: vi.fn(),
    onMarkDone: vi.fn(),
    onStartFocus: vi.fn(),
    ...overrides,
  };
}

describe("TodayTaskList", () => {
  it("uses DataTable for the limited list with project, priority, status, and responsive cards", () => {
    const { container } = renderWithUser(<TodayTaskList {...props()} />);

    const table = screen.getByRole("table", { name: "Today's tasks" });
    expect(within(table).getByRole("columnheader", { name: "Task" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Project" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Priority" })).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "Prepare weekly review" })).toBeInTheDocument();
    expect(within(table).getByText("Learning plan")).toBeInTheDocument();
    expect(within(table).getByText("P1 — High")).toBeInTheDocument();
    expect(within(table).getByText("In progress")).toBeInTheDocument();
    expect(within(table).getByText("No project")).toBeInTheDocument();
    expect(container.querySelector(".lifeos-data-table__card-view")).toBeInTheDocument();
  });

  it("forwards set-MIT, complete, and start actions with the Task id", async () => {
    const onSetMit = vi.fn();
    const onMarkDone = vi.fn();
    const onStartFocus = vi.fn();
    const { user } = renderWithUser(
      <TodayTaskList {...props({ onSetMit, onMarkDone, onStartFocus })} />,
    );

    const taskTwoActions = screen.getAllByLabelText("Actions for Organize tax documents")[0]!;
    await user.click(within(taskTwoActions).getByRole("button", { name: "Set as MIT" }));
    await user.click(within(taskTwoActions).getByRole("button", { name: "Mark done" }));
    await user.click(within(taskTwoActions).getByRole("button", { name: "Start focus" }));

    expect(onSetMit).toHaveBeenCalledWith("task-2");
    expect(onMarkDone).toHaveBeenCalledWith("task-2");
    expect(onStartFocus).toHaveBeenCalledWith("task-2");
  });

  it("does not offer mutation actions for a Task already Done", () => {
    renderWithUser(<TodayTaskList {...props()} />);

    expect(screen.queryByLabelText("Actions for Compare hosting options")).not.toBeInTheDocument();
  });

  it("renders the first-use state with add and view-all paths", async () => {
    const onAddTask = vi.fn();
    const { user } = renderWithUser(
      <TodayTaskList {...props({ state: { type: "empty" }, onAddTask })} />,
    );

    expect(screen.getByText("No tasks planned for today")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(onAddTask).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "View all tasks" })).toHaveAttribute(
      "href",
      "/life-os/app/tasks",
    );
  });

  it("treats a ready empty array as the truthful empty state", () => {
    renderWithUser(<TodayTaskList {...props({ state: { type: "ready", tasks: [] } })} />);
    expect(screen.getByText("No tasks planned for today")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("isolates loading and error states", async () => {
    const onRetry = vi.fn();
    const { container, rerender, user } = renderWithUser(
      <TodayTaskList {...props({ state: { type: "loading" } })} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading today's tasks…");
    expect(container.querySelector(".lifeos-skeleton-table")).toBeInTheDocument();

    rerender(
      <TodayTaskList
        {...props({
          state: { type: "error", message: "Other Today sections are still available." },
          onRetry,
        })}
      />,
    );
    expect(screen.getByText("Today's tasks couldn't load.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations in ready, empty, loading, and error states", async () => {
    const { container, rerender } = renderWithUser(<TodayTaskList {...props()} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TodayTaskList {...props({ state: { type: "empty" } })} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TodayTaskList {...props({ state: { type: "loading" } })} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodayTaskList
        {...props({ state: { type: "error", message: "Other sections are available." } })}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
