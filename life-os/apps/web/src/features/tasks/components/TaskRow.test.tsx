import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TaskListItem } from "../model/task";
import { TaskRow } from "./TaskRow";

const TASK: TaskListItem = {
  id: "task-809",
  title: "Build TaskRow and TaskCard",
  status: "IN_PROGRESS",
  priority: "P1",
  project: { id: "project-life-os", name: "LifeOS", href: "/life-os/app/projects/life-os" },
  dueAt: "2026-08-22T12:00:00Z",
  progress: 45,
  commentCount: 3,
  isMit: true,
};

const NOW = new Date("2026-08-21T12:00:00Z");

describe("TaskRow", () => {
  it("renders the complete task projection with timezone-aware metadata", () => {
    renderWithUser(<TaskRow task={TASK} now={NOW} locale="en-US" timeZone="Asia/Kolkata" />);

    expect(
      screen.getByRole("link", { name: "Open task: Build TaskRow and TaskCard" }),
    ).toHaveAttribute("href", "/life-os/app/tasks/task-809");
    expect(screen.getByRole("link", { name: "LifeOS" })).toHaveAttribute(
      "href",
      "/life-os/app/projects/life-os",
    );
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("P1 — High")).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
    expect(screen.getByText("Due Aug 22, 2026, 5:30 PM")).toBeInTheDocument();
    expect(screen.getByLabelText("3 comments")).toBeInTheDocument();

    const progress = screen.getByRole("progressbar", {
      name: "Build TaskRow and TaskCard progress",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "45");
    expect(progress).toHaveAttribute("aria-valuetext", "45% complete");
  });

  it("renders and updates controlled selection", async () => {
    const onSelectedChange = vi.fn();
    const { user } = renderWithUser(
      <TaskRow task={TASK} selected onSelectedChange={onSelectedChange} now={NOW} />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select Build TaskRow and TaskCard" });
    expect(checkbox).toBeChecked();
    expect(checkbox.closest(".lifeos-task-row")).toHaveClass("lifeos-task-row--selected");

    await user.click(checkbox);
    expect(onSelectedChange).toHaveBeenCalledWith(false);
  });

  it("renders overdue, blocked, done and archived lifecycle states honestly", () => {
    const { rerender } = renderWithUser(
      <TaskRow task={{ ...TASK, status: "BLOCKED", blockerCount: 2, overdue: true }} now={NOW} />,
    );

    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("2 blockers")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();

    rerender(
      <TaskRow task={{ ...TASK, status: "DONE", progress: 100, overdue: true }} now={NOW} />,
    );
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open task/ }).closest(".lifeos-task-row")).toHaveClass(
      "lifeos-task-row--done",
    );

    rerender(
      <TaskRow task={{ ...TASK, archivedAt: "2026-08-20T08:00:00Z", overdue: true }} now={NOW} />,
    );
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("renders loading and projectless states without invented data", () => {
    const { rerender } = renderWithUser(<TaskRow loading />);
    expect(screen.getByText("Loading task.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(<TaskRow task={{ ...TASK, project: null, dueAt: null, commentCount: 0 }} now={NOW} />);
    expect(screen.getByText("No project")).toBeInTheDocument();
    expect(screen.getByText("No due date")).toBeInTheDocument();
    expect(screen.getByLabelText("0 comments")).toBeInTheDocument();
  });

  it("offers only valid active, blocked, terminal and archived actions", async () => {
    const onStartFocus = vi.fn();
    const onToggleMit = vi.fn();
    const onMarkDone = vi.fn();
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const onArchive = vi.fn();
    const onReopen = vi.fn();
    const onRestore = vi.fn();
    const onDelete = vi.fn();
    const { user, rerender } = renderWithUser(
      <TaskRow
        task={TASK}
        now={NOW}
        onStartFocus={onStartFocus}
        onToggleMit={onToggleMit}
        onMarkDone={onMarkDone}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onArchive={onArchive}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Actions for Build TaskRow and TaskCard" }),
    );
    expect(screen.getByRole("menuitem", { name: "Start focus" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Remove MIT" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Mark done" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Duplicate task" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Archive task" }));
    expect(onArchive).toHaveBeenCalledOnce();

    rerender(
      <TaskRow task={{ ...TASK, status: "BLOCKED" }} now={NOW} onStartFocus={onStartFocus} />,
    );
    expect(screen.queryByRole("button", { name: /Actions for/ })).not.toBeInTheDocument();

    rerender(<TaskRow task={{ ...TASK, status: "DONE" }} now={NOW} onReopen={onReopen} />);
    await user.click(screen.getByRole("button", { name: /Actions for/ }));
    await user.click(screen.getByRole("menuitem", { name: "Reopen task" }));
    expect(onReopen).toHaveBeenCalledOnce();

    rerender(
      <TaskRow
        task={{ ...TASK, archivedAt: "2026-08-20T08:00:00Z" }}
        now={NOW}
        onRestore={onRestore}
        onDelete={onDelete}
        onEdit={onEdit}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Actions for/ }));
    expect(screen.queryByRole("menuitem", { name: "Edit task" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Delete task" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <TaskRow
        task={{ ...TASK, status: "BLOCKED", blockerCount: 1, overdue: true }}
        selected
        onSelectedChange={vi.fn()}
        onEdit={vi.fn()}
        now={NOW}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
