import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { TaskDetailsHeaderTask } from "./TaskDetailsHeader";
import { TaskDetailsHeader } from "./TaskDetailsHeader";

const TASK: TaskDetailsHeaderTask = {
  id: "task-814",
  title: "Build Task details header",
  description: "Make Task context and actions clear before the detail tabs are composed.",
  status: "IN_PROGRESS",
  priority: "P1",
  project: {
    id: "project-life-os",
    name: "LifeOS",
    href: "/life-os/app/projects/project-life-os",
  },
  dueAt: "2026-08-24T12:00:00Z",
  estimateMinutes: 150,
  spentMinutes: 75,
  progress: 50,
  labels: [
    { id: "label-frontend", name: "Frontend" },
    { id: "label-accessibility", name: "Accessibility" },
  ],
  isMit: true,
};

const NOW = new Date("2026-08-23T12:00:00Z");

describe("TaskDetailsHeader", () => {
  it("renders deep links, identity and the full timezone-aware metadata contract", async () => {
    const { container } = renderWithUser(
      <TaskDetailsHeader
        task={TASK}
        now={NOW}
        locale="en-US"
        timeZone="Asia/Kolkata"
        onEdit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Build Task details header" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "href",
      "/life-os/app/tasks",
    );
    expect(
      screen.getByText("Build Task details header", { selector: "[aria-current='page']" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LifeOS" })).toHaveAttribute(
      "href",
      "/life-os/app/projects/project-life-os",
    );
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("P1 — High")).toBeInTheDocument();
    expect(screen.getByText("MIT — Most Important Task")).toBeInTheDocument();
    expect(screen.getByText("Aug 24, 2026, 5:30 PM")).toBeInTheDocument();
    expect(screen.getByText("2 hr 30 min")).toBeInTheDocument();
    expect(screen.getByText("1 hr 15 min")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Accessibility")).toBeInTheDocument();

    const progress = screen.getByRole("progressbar", {
      name: "Build Task details header progress",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "50");
    expect(progress).toHaveAttribute("aria-valuetext", "50% complete");

    await expectNoAccessibilityViolations(container);
  });

  it("states absent optional metadata without inventing values", () => {
    renderWithUser(
      <TaskDetailsHeader
        task={{
          ...TASK,
          description: null,
          project: null,
          dueAt: null,
          estimateMinutes: null,
          spentMinutes: null,
          labels: [],
          isMit: false,
        }}
        now={NOW}
      />,
    );

    expect(screen.getByText("No project")).toBeInTheDocument();
    expect(screen.getByText("No due date")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
    expect(screen.getByText("No labels")).toBeInTheDocument();
    expect(screen.queryByText("MIT — Most Important Task")).not.toBeInTheDocument();
    expect(screen.queryByText(TASK.description!)).not.toBeInTheDocument();
  });

  it("shows only lifecycle-valid actions for an archived Task", async () => {
    const onRestore = vi.fn();
    const onDelete = vi.fn();
    const { user } = renderWithUser(
      <TaskDetailsHeader
        task={{ ...TASK, archivedAt: "2026-08-22T12:00:00Z", overdue: true }}
        now={NOW}
        onEdit={vi.fn()}
        onRestore={onRestore}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions for Build Task details header" }));

    const menu = screen.getByRole("menu", { name: "Actions for Build Task details header" });
    expect(within(menu).queryByRole("menuitem", { name: "Edit task" })).not.toBeInTheDocument();
    await user.click(within(menu).getByRole("menuitem", { name: "Restore task" }));
    expect(onRestore).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Actions for Build Task details header" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete task" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("renders a deleted Task as unavailable and suppresses mutations", async () => {
    const { container } = renderWithUser(
      <TaskDetailsHeader
        task={{ ...TASK, deletedAt: "2026-08-23T09:00:00Z" }}
        now={NOW}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.getByText("This task was deleted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Actions for/ })).not.toBeInTheDocument();
    expect(container.querySelector(".lifeos-task-details-header--deleted")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("supports a deleted response without stale Task metadata", () => {
    renderWithUser(<TaskDetailsHeader deleted />);

    expect(screen.getByRole("heading", { level: 1, name: "Task unavailable" })).toBeInTheDocument();
    expect(
      screen.getByText("This Task is no longer available. Return to Tasks to continue."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("keeps stale metadata visible during a conflict but blocks mutations", async () => {
    const onLoadLatest = vi.fn();
    const { user, container } = renderWithUser(
      <TaskDetailsHeader
        task={TASK}
        now={NOW}
        conflictError="Your displayed Task is version 4. The latest saved version is version 5."
        onLoadLatest={onLoadLatest}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("This Task changed elsewhere")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Actions for/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load latest" }));
    expect(onLoadLatest).toHaveBeenCalledOnce();

    await expectNoAccessibilityViolations(container);
  });

  it("shows blocker and overdue context and reuses the canonical Task action menu", async () => {
    const onMarkDone = vi.fn();
    const { user } = renderWithUser(
      <TaskDetailsHeader
        task={{ ...TASK, status: "BLOCKED", blockerCount: 2, overdue: true, isMit: false }}
        now={NOW}
        onMarkDone={onMarkDone}
        onStartFocus={vi.fn()}
      />,
    );

    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("2 blockers")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Actions for/ }));
    expect(screen.queryByRole("menuitem", { name: "Start focus" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Mark done" }));
    expect(onMarkDone).toHaveBeenCalledOnce();
  });

  it("clamps invalid progress and renders a truthful loading skeleton", () => {
    const { rerender } = renderWithUser(
      <TaskDetailsHeader task={{ ...TASK, progress: Number.POSITIVE_INFINITY }} now={NOW} />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

    rerender(<TaskDetailsHeader loading />);
    expect(screen.getByText("Loading task details header.")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("accepts a caller-supplied deep-link trail", () => {
    renderWithUser(
      <TaskDetailsHeader
        task={TASK}
        breadcrumbs={[
          { label: "Projects", href: "/life-os/app/projects" },
          { label: "LifeOS", href: "/life-os/app/projects/project-life-os" },
          { label: TASK.title, href: `/life-os/app/tasks/${TASK.id}` },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole("link", {
        name: "LifeOS",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tasks" })).not.toBeInTheDocument();
  });
});
