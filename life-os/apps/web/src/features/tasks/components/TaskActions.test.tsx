import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithUser } from "@test/render";

import type { TaskListItem } from "../model/task";
import { TaskActions } from "./TaskActions";

const MOCK_TASK: TaskListItem = {
  id: "task-1",
  title: "Test Task",
  status: "IN_PROGRESS",
  priority: "P1",
  progress: 0,
  commentCount: 0,
};

describe("TaskActions", () => {
  it("returns null when no action callbacks are provided", () => {
    const { container } = renderWithUser(<TaskActions task={MOCK_TASK} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders active task actions including skip occurrence for recurring task", async () => {
    const onStartFocus = vi.fn();
    const onToggleMit = vi.fn();
    const onSkipOccurrence = vi.fn();
    const onMarkDone = vi.fn();
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const onArchive = vi.fn();

    const recurringTask: TaskListItem = {
      ...MOCK_TASK,
      recurringSeriesId: "series-1",
      isMit: true,
    };

    const { user } = renderWithUser(
      <TaskActions
        task={recurringTask}
        onStartFocus={onStartFocus}
        onToggleMit={onToggleMit}
        onSkipOccurrence={onSkipOccurrence}
        onMarkDone={onMarkDone}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onArchive={onArchive}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Actions for Test Task" }));

    expect(screen.getByRole("menuitem", { name: "Start focus" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Remove MIT" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Skip occurrence" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Mark done" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Duplicate task" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Skip occurrence" }));
    expect(onSkipOccurrence).toHaveBeenCalledOnce();
  });

  it("renders archived task actions", async () => {
    const onRestore = vi.fn();
    const onDelete = vi.fn();

    const archivedTask: TaskListItem = {
      ...MOCK_TASK,
      archivedAt: "2026-09-01T00:00:00Z",
    };

    const { user } = renderWithUser(
      <TaskActions task={archivedTask} onRestore={onRestore} onDelete={onDelete} />,
    );

    await user.click(screen.getByRole("button", { name: "Actions for Test Task" }));

    expect(screen.getByRole("menuitem", { name: "Restore task" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete task" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Restore task" }));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("renders reopen action for completed tasks", async () => {
    const onReopen = vi.fn();
    const doneTask: TaskListItem = {
      ...MOCK_TASK,
      status: "DONE",
    };

    const { user } = renderWithUser(<TaskActions task={doneTask} onReopen={onReopen} />);

    await user.click(screen.getByRole("button", { name: "Actions for Test Task" }));

    expect(screen.getByRole("menuitem", { name: "Reopen task" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Reopen task" }));
    expect(onReopen).toHaveBeenCalledOnce();
  });

  it("renders Set as MIT label when task is not MIT", async () => {
    const onToggleMit = vi.fn();
    const { user } = renderWithUser(
      <TaskActions task={{ ...MOCK_TASK, isMit: false }} onToggleMit={onToggleMit} />,
    );

    await user.click(screen.getByRole("button", { name: "Actions for Test Task" }));

    expect(screen.getByRole("menuitem", { name: "Set as MIT" })).toBeInTheDocument();
  });
});
