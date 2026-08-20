import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import type { Project } from "../model/project";
import type { Milestone } from "../model/milestone";
import type { ProjectOverviewTask } from "./ProjectOverview";
import { ProjectDetailsScreen } from "./ProjectDetailsScreen";

const NOW = new Date("2026-08-20T12:00:00Z");

const MOCK_PROJECT: Project = {
  id: "project-1",
  name: "Website Redesign v2",
  description: "Redesigning main marketing site and user dashboard.",
  status: "ACTIVE",
  priority: "P1",
  health: "ON_TRACK",
  color: "blue",
  icon: "layout",
  startDate: "2026-08-01",
  deadlineDate: "2026-09-30",
  completedTasksCount: 5,
  totalTasksCount: 10,
  updatedAt: "2026-08-20T10:00:00Z",
  version: 2,
};

const MOCK_MILESTONES: readonly Milestone[] = [
  {
    id: "m1",
    projectId: "project-1",
    title: "Phase 1 Foundation",
    date: "2026-08-10",
    status: "COMPLETED",
    ordering: 0,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-10T10:00:00Z",
    version: 1,
  },
];

describe("ProjectDetailsScreen", () => {
  it("renders header, project identity, overview tab and tablist", async () => {
    const { container } = renderWithUser(
      <ProjectDetailsScreen
        project={MOCK_PROJECT}
        milestones={MOCK_MILESTONES}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
        ownerName="Partha Hudati"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Website Redesign v2" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Project details tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Timeline/i })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("switches tabs when tab buttons are clicked", async () => {
    const onTabChange = vi.fn();
    const { user } = renderWithUser(
      <ProjectDetailsScreen
        project={MOCK_PROJECT}
        milestones={MOCK_MILESTONES}
        selectedTab="overview"
        onTabChange={onTabChange}
        now={NOW}
      />,
    );

    const timelineTab = screen.getByRole("tab", { name: /Timeline/i });
    await user.click(timelineTab);

    expect(onTabChange).toHaveBeenCalledWith("timeline");
  });

  it("renders loading skeleton state when loading is true", async () => {
    const { container } = renderWithUser(<ProjectDetailsScreen loading />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders not found state when notFound is true", async () => {
    const onGoBack = vi.fn();
    const { container, user } = renderWithUser(
      <ProjectDetailsScreen notFound onGoBack={onGoBack} />,
    );

    expect(screen.getByText("Project not found")).toBeInTheDocument();
    const backBtn = screen.getByRole("button", { name: "Back" });
    await user.click(backBtn);
    expect(onGoBack).toHaveBeenCalledTimes(1);

    await expectNoAccessibilityViolations(container);
  });

  it("renders forbidden state when forbidden is true", async () => {
    const { container } = renderWithUser(<ProjectDetailsScreen forbidden />);

    expect(screen.getByText("Access denied")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders error state when error is provided", async () => {
    const onRetry = vi.fn();
    const { container, user } = renderWithUser(
      <ProjectDetailsScreen error="API network failure" onRetry={onRetry} />,
    );

    expect(screen.getByText("Failed to load project details")).toBeInTheDocument();
    expect(screen.getByText("API network failure")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Try again" });
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    await expectNoAccessibilityViolations(container);
  });

  it("renders archived warning banner when project is archived", async () => {
    const archivedProject: Project = {
      ...MOCK_PROJECT,
      archivedAt: "2026-08-15T00:00:00Z",
    };

    const { container } = renderWithUser(
      <ProjectDetailsScreen project={archivedProject} now={NOW} />,
    );

    expect(screen.getByText(/This project was archived/i)).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders tasks tab with top tasks data table and add task button", async () => {
    const onAddTask = vi.fn();
    const mockTasks: readonly ProjectOverviewTask[] = [
      {
        id: "task-1",
        title: "Frontend design audit",
        status: "IN_PROGRESS",
        priority: "P1",
        dueDate: "2026-08-25",
        assigneeName: "Partha",
      },
    ];

    const { user } = renderWithUser(
      <ProjectDetailsScreen
        project={MOCK_PROJECT}
        topTasks={mockTasks}
        selectedTab="tasks"
        onAddTask={onAddTask}
        now={NOW}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Tasks (1)" })).toBeInTheDocument();
    expect(screen.getByText("Frontend design audit")).toBeInTheDocument();

    const addBtn = screen.getAllByRole("button", { name: "Add task" })[0];
    expect(addBtn).toBeDefined();
    await user.click(addBtn!);
    expect(onAddTask).toHaveBeenCalledTimes(1);
  });

  it("renders files, notes, and activity tabs", async () => {
    const onUploadAttachment = vi.fn();
    const onAddComment = vi.fn();

    const { rerender } = renderWithUser(
      <ProjectDetailsScreen
        project={MOCK_PROJECT}
        selectedTab="files"
        onUploadAttachment={onUploadAttachment}
        now={NOW}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Files & Attachments" }),
    ).toBeInTheDocument();

    rerender(
      <ProjectDetailsScreen
        project={MOCK_PROJECT}
        selectedTab="notes"
        onAddComment={onAddComment}
        now={NOW}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Notes & Discussion" }),
    ).toBeInTheDocument();

    rerender(
      <ProjectDetailsScreen
        project={MOCK_PROJECT}
        selectedTab="activity"
        activityEvents={[
          {
            id: "act-1",
            actorName: "Partha",
            action: "created project",
            createdAt: "2026-08-20T10:00:00Z",
          },
        ]}
        now={NOW}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Recent Activity" })).toBeInTheDocument();
  });
});
