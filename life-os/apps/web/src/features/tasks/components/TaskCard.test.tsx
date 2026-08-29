import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TaskListItem } from "../model/task";
import { TaskCard } from "./TaskCard";

const TASK: TaskListItem = {
  id: "task-809",
  title: "Build responsive task components",
  status: "TO_DO",
  priority: "P2",
  project: { id: "life-os", name: "LifeOS" },
  dueAt: "2026-08-20T12:00:00Z",
  progress: 25,
  commentCount: 1,
};

const NOW = new Date("2026-08-21T12:00:00Z");

describe("TaskCard", () => {
  it("renders task content, overdue state, progress and fallback links", () => {
    renderWithUser(<TaskCard task={TASK} now={NOW} locale="en-US" timeZone="UTC" />);

    expect(
      screen.getByRole("link", { name: "Open task: Build responsive task components" }),
    ).toHaveAttribute("href", "/life-os/app/tasks/task-809");
    expect(screen.getByRole("link", { name: "LifeOS" })).toHaveAttribute(
      "href",
      "/life-os/app/projects/life-os",
    );
    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("P2 — Medium")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /responsive task components progress/ }),
    ).toHaveAttribute("aria-valuetext", "25% complete");
  });

  it("renders controlled selection and invokes its callback", async () => {
    const onSelectedChange = vi.fn();
    const { user } = renderWithUser(
      <TaskCard task={TASK} selected onSelectedChange={onSelectedChange} now={NOW} />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Select Build responsive task components",
    });
    expect(checkbox).toBeChecked();
    expect(checkbox.closest(".lifeos-task-card")).toHaveClass("lifeos-task-card--selected");
    await user.click(checkbox);
    expect(onSelectedChange).toHaveBeenCalledWith(false);
  });

  it("renders loading, MIT, blocked, done and archived states", () => {
    const { rerender } = renderWithUser(<TaskCard loading />);
    expect(screen.getByText("Loading task card.")).toBeInTheDocument();

    rerender(
      <TaskCard task={{ ...TASK, status: "BLOCKED", blockerCount: 1, isMit: true }} now={NOW} />,
    );
    expect(screen.getByText("MIT")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("1 blocker")).toBeInTheDocument();

    rerender(<TaskCard task={{ ...TASK, status: "DONE", progress: 140 }} now={NOW} />);
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(
      screen.getByRole("link", { name: /Open task/ }).closest(".lifeos-task-card"),
    ).toHaveClass("lifeos-task-card--done");

    rerender(<TaskCard task={{ ...TASK, archivedAt: "2026-08-20T08:00:00Z" }} now={NOW} />);
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("supports custom task links and omits absent controls", () => {
    renderWithUser(
      <TaskCard task={{ ...TASK, project: null, dueAt: null, href: "/custom/task" }} now={NOW} />,
    );

    expect(screen.getByRole("link", { name: /Open task/ })).toHaveAttribute("href", "/custom/task");
    expect(screen.getByText("No project")).toBeInTheDocument();
    expect(screen.getByText("No due date")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Actions for/ })).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <TaskCard
        task={{ ...TASK, status: "BLOCKED", blockerCount: 2, isMit: true }}
        selected
        onSelectedChange={vi.fn()}
        onEdit={vi.fn()}
        now={NOW}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
