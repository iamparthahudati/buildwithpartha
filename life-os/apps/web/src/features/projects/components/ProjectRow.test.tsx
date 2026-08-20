import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ProjectRow } from "./ProjectRow";
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

describe("ProjectRow", () => {
  it("renders project information correctly in default state", () => {
    renderWithUser(<ProjectRow project={MOCK_PROJECT} now={NOW} locale="en-US" timeZone="UTC" />);

    expect(screen.getByRole("link", { name: "Open project: Launch Platform v1" })).toHaveAttribute(
      "href",
      "/life-os/app/projects/project-1",
    );
    expect(
      screen.getByText("Deploy the engineering foundations and core screens."),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("P1 — High")).toBeInTheDocument();
    expect(screen.getByText("On track")).toBeInTheDocument();

    const progress = screen.getByRole("progressbar", { name: "Launch Platform v1 progress" });
    expect(progress).toHaveAttribute("aria-valuenow", "4");
    expect(progress).toHaveAttribute("aria-valuemax", "10");
    expect(progress).toHaveAttribute("aria-valuetext", "4 of 10 tasks done");

    expect(screen.getByText("Deadline: Aug 30, 2026")).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it("renders loading skeleton when loading is true", () => {
    renderWithUser(<ProjectRow loading />);
    expect(screen.getByText("Loading project.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders archived state correctly", () => {
    const archivedProject: Project = {
      ...MOCK_PROJECT,
      archivedAt: "2026-08-19T10:00:00Z",
    };

    renderWithUser(
      <ProjectRow project={archivedProject} now={NOW} locale="en-US" timeZone="UTC" />,
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("renders overdue state correctly", () => {
    const overdueProject: Project = {
      ...MOCK_PROJECT,
      deadlineDate: "2026-08-15",
    };

    renderWithUser(<ProjectRow project={overdueProject} now={NOW} locale="en-US" timeZone="UTC" />);

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    const deadlineText = screen.getByText("Deadline: Aug 15, 2026");
    expect(deadlineText).toHaveClass("lifeos-tone--danger");
  });

  it("handles empty tasks count correctly", () => {
    const noTasksProject: Project = {
      ...MOCK_PROJECT,
      completedTasksCount: 0,
      totalTasksCount: 0,
    };

    renderWithUser(<ProjectRow project={noTasksProject} now={NOW} locale="en-US" timeZone="UTC" />);

    expect(screen.getByText("No tasks yet.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("triggers actions menu callback when selected", async () => {
    const onEdit = vi.fn();
    const onComplete = vi.fn();
    const onArchive = vi.fn();

    const { user } = renderWithUser(
      <ProjectRow
        project={MOCK_PROJECT}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
        onEdit={onEdit}
        onComplete={onComplete}
        onArchive={onArchive}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Project actions" });
    await user.click(trigger);

    const editBtn = screen.getByRole("menuitem", { name: "Edit" });
    const completeBtn = screen.getByRole("menuitem", { name: "Complete" });
    const archiveBtn = screen.getByRole("menuitem", { name: "Archive" });

    expect(editBtn).toBeInTheDocument();
    expect(completeBtn).toBeInTheDocument();
    expect(archiveBtn).toBeInTheDocument();

    await user.click(editBtn);
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <ProjectRow project={MOCK_PROJECT} now={NOW} locale="en-US" timeZone="UTC" />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
