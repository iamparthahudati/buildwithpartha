import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ProjectDetailsHeader } from "./ProjectDetailsHeader";
import type { Project } from "../model/project";

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
  completedTasksCount: 4,
  totalTasksCount: 10,
  updatedAt: "2026-08-20T12:00:00Z",
  version: 1,
};

const NOW = new Date("2026-08-20T17:00:00Z");

describe("ProjectDetailsHeader", () => {
  it("renders project details correctly in default state", async () => {
    const { container } = renderWithUser(
      <ProjectDetailsHeader
        project={MOCK_PROJECT}
        ownerName="Sarah Connor"
        estimatedHours={40}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
        onAddTask={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Launch Platform v1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Deploy the engineering foundations and core screens."),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("P1 — High")).toBeInTheDocument();
    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByText("Aug 1, 2026 – Aug 30, 2026")).toBeInTheDocument();
    expect(screen.getByText("40h estimated")).toBeInTheDocument();

    const progress = screen.getByRole("progressbar", { name: "Launch Platform v1 progress" });
    expect(progress).toHaveAttribute("aria-valuenow", "4");
    expect(progress).toHaveAttribute("aria-valuemax", "10");

    expect(screen.getByRole("button", { name: "Add task" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders loading skeleton when loading is true", async () => {
    const { container } = renderWithUser(<ProjectDetailsHeader loading />);

    expect(screen.getByText("Loading project details header.")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders archived state correctly and adjusts actions", async () => {
    const archivedProject: Project = {
      ...MOCK_PROJECT,
      archivedAt: "2026-08-19T10:00:00Z",
    };

    const onRestore = vi.fn();

    const { user, container } = renderWithUser(
      <ProjectDetailsHeader
        project={archivedProject}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
        onAddTask={vi.fn()}
        onRestore={onRestore}
      />,
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
    // Default Add task action should be hidden when archived
    expect(screen.queryByRole("button", { name: "Add task" })).not.toBeInTheDocument();

    // Open secondary menu
    const menuButton = screen.getByRole("button", { name: "More actions" });
    await user.click(menuButton);

    expect(screen.getByRole("menuitem", { name: "Restore project" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders overdue state correctly when deadline is past", async () => {
    const overdueProject: Project = {
      ...MOCK_PROJECT,
      startDate: null,
      deadlineDate: "2026-08-15",
    };

    const { container } = renderWithUser(
      <ProjectDetailsHeader project={overdueProject} now={NOW} locale="en-US" timeZone="UTC" />,
    );

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Due Aug 15, 2026")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("triggers callbacks when primary and secondary actions are clicked", async () => {
    const onAddTask = vi.fn();
    const onEdit = vi.fn();

    const { user } = renderWithUser(
      <ProjectDetailsHeader project={MOCK_PROJECT} onAddTask={onAddTask} onEdit={onEdit} />,
    );

    const addTaskButton = screen.getByRole("button", { name: "Add task" });
    await user.click(addTaskButton);
    expect(onAddTask).toHaveBeenCalledTimes(1);

    const menuButton = screen.getByRole("button", { name: "More actions" });
    await user.click(menuButton);

    const editItem = screen.getByRole("menuitem", { name: "Edit project" });
    await user.click(editItem);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
