import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import {
  ProjectOverview,
  type ProjectOverviewTask,
  type OverviewActivityItem,
} from "./ProjectOverview";
import type { Project } from "../model/project";
import type { ChartDatum } from "@components/navigation";

const MOCK_PROJECT: Project = {
  id: "project-1",
  name: "Launch Platform v1",
  description: "Deploy the engineering foundations and core screens.",
  status: "ACTIVE",
  priority: "P1",
  health: "ON_TRACK",
  color: "blue",
  icon: "rocket",
  startDate: "2026-08-01",
  deadlineDate: "2026-08-30",
  completedTasksCount: 5,
  totalTasksCount: 10,
  updatedAt: "2026-08-20T12:00:00Z",
  version: 1,
};

const MOCK_TOP_TASKS: readonly ProjectOverviewTask[] = [
  {
    id: "task-1",
    title: "Implement authentication flow",
    status: "IN_PROGRESS",
    priority: "P1",
    dueDate: "2026-08-25",
    assigneeName: "Sarah Connor",
  },
  {
    id: "task-2",
    title: "Set up CI pipeline",
    status: "COMPLETED",
    priority: "P2",
    dueDate: "2026-08-15",
    assigneeName: "John Doe",
  },
];

const MOCK_ACTIVITY: readonly OverviewActivityItem[] = [
  {
    id: "act-1",
    actorName: "Sarah Connor",
    action: "completed task",
    object: { label: "Set up CI pipeline", href: "#task-2" },
    createdAt: "2026-08-20T11:30:00Z",
  },
];

const MOCK_STATUS_BREAKDOWN: readonly ChartDatum[] = [
  { id: "status-1", label: "Completed", value: 5 },
  { id: "status-2", label: "In progress", value: 3 },
  { id: "status-3", label: "Planned", value: 2 },
];

const MOCK_PRIORITY_BREAKDOWN: readonly ChartDatum[] = [
  { id: "priority-1", label: "P1 — High", value: 4 },
  { id: "priority-2", label: "P2 — Medium", value: 4 },
  { id: "priority-3", label: "P3 — Low", value: 2 },
];

const NOW = new Date("2026-08-20T17:00:00Z");

describe("ProjectOverview", () => {
  it("renders project overview cards, charts, top tasks, about section and activity feed", async () => {
    const onAddTask = vi.fn();
    const onEditProject = vi.fn();
    const onTaskClick = vi.fn();

    const { container } = renderWithUser(
      <ProjectOverview
        project={MOCK_PROJECT}
        ownerName="Sarah Connor"
        estimatedHours={40}
        actualHours={20}
        labels={["Frontend", "Infrastructure"]}
        topTasks={MOCK_TOP_TASKS}
        activityEvents={MOCK_ACTIVITY}
        statusBreakdown={MOCK_STATUS_BREAKDOWN}
        priorityBreakdown={MOCK_PRIORITY_BREAKDOWN}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
        onAddTask={onAddTask}
        onEditProject={onEditProject}
        onTaskClick={onTaskClick}
      />,
    );

    // Verify progress card metrics
    expect(screen.getByText("OVERALL PROGRESS")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("5 of 10 tasks completed")).toBeInTheDocument();
    expect(screen.getByText("20h logged / 40h estimated")).toBeInTheDocument();

    // Verify task breakdown card
    expect(screen.getByText("TASKS BREAKDOWN")).toBeInTheDocument();
    expect(screen.getAllByText("10")[0]).toBeInTheDocument();
    expect(screen.getByText("5 Done")).toBeInTheDocument();
    expect(screen.getByText("5 Open")).toBeInTheDocument();

    // Verify timeline & hours card
    expect(screen.getByText("TIMELINE & HOURS")).toBeInTheDocument();
    expect(screen.getByText("Aug 30, 2026")).toBeInTheDocument();

    // Verify health card
    expect(screen.getByText("PROJECT HEALTH")).toBeInTheDocument();
    expect(screen.getByText("On track")).toBeInTheDocument();

    // Verify breakdown charts
    expect(screen.getByText("Tasks by status")).toBeInTheDocument();
    expect(screen.getByText("Tasks by priority")).toBeInTheDocument();

    // Verify top tasks section
    expect(screen.getByRole("heading", { level: 2, name: "Top tasks" })).toBeInTheDocument();
    expect(screen.getByText("Implement authentication flow")).toBeInTheDocument();
    expect(screen.getAllByText("Set up CI pipeline")[0]).toBeInTheDocument();

    // Verify about section
    expect(screen.getByRole("heading", { level: 2, name: "About project" })).toBeInTheDocument();
    expect(
      screen.getByText("Deploy the engineering foundations and core screens."),
    ).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Infrastructure")).toBeInTheDocument();
    expect(screen.getByText("Owner: Sarah Connor")).toBeInTheDocument();

    // Verify activity section
    expect(screen.getByRole("heading", { level: 2, name: "Recent activity" })).toBeInTheDocument();
    expect(screen.getByText("completed task")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders loading skeleton when loading is true", async () => {
    const { container } = renderWithUser(<ProjectOverview loading />);

    expect(screen.queryByText("OVERALL PROGRESS")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders empty state when empty is true or project is null", async () => {
    const onAddTask = vi.fn();
    const { user, container } = renderWithUser(<ProjectOverview empty onAddTask={onAddTask} />);

    expect(screen.getByText("No project overview available")).toBeInTheDocument();
    const addButton = screen.getByRole("button", { name: "Add first task" });
    expect(addButton).toBeInTheDocument();

    await user.click(addButton);
    expect(onAddTask).toHaveBeenCalledTimes(1);

    await expectNoAccessibilityViolations(container);
  });

  it("renders error state when error message is provided", async () => {
    const onRetry = vi.fn();
    const { user, container } = renderWithUser(
      <ProjectOverview error="Network timeout fetching details" onRetry={onRetry} />,
    );

    expect(screen.getByText("Unable to load project overview")).toBeInTheDocument();
    expect(screen.getByText("Network timeout fetching details")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "Try again" });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);

    await expectNoAccessibilityViolations(container);
  });

  it("triggers onEditProject when edit button in About section is clicked", async () => {
    const onEditProject = vi.fn();
    const { user } = renderWithUser(
      <ProjectOverview project={MOCK_PROJECT} onEditProject={onEditProject} />,
    );

    const editBtn = screen.getByRole("button", { name: "Edit" });
    await user.click(editBtn);

    expect(onEditProject).toHaveBeenCalledTimes(1);
  });

  it("shows overdue badge when deadline date is in the past", async () => {
    const pastProject: Project = {
      ...MOCK_PROJECT,
      deadlineDate: "2026-08-01",
    };

    renderWithUser(
      <ProjectOverview
        project={pastProject}
        now={new Date("2026-08-15T00:00:00Z")}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });
});
