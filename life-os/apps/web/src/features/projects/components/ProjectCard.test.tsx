import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ProjectCard } from "./ProjectCard";
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

describe("ProjectCard", () => {
  it("renders project information correctly in default state", () => {
    renderWithUser(<ProjectCard project={MOCK_PROJECT} now={NOW} locale="en-US" timeZone="UTC" />);

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

  it("renders a project logo when coverImageUrl is set", () => {
    const { container } = renderWithUser(
      <ProjectCard
        project={{ ...MOCK_PROJECT, coverImageUrl: "https://example.test/logo.png" }}
        now={NOW}
        locale="en-US"
        timeZone="UTC"
      />,
    );

    const img = container.querySelector<HTMLImageElement>(".lifeos-project-card__logo");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.test/logo.png");
    expect(img).toHaveAttribute("alt", "");
  });

  it("renders no logo when coverImageUrl is absent", () => {
    const { container } = renderWithUser(
      <ProjectCard project={MOCK_PROJECT} now={NOW} locale="en-US" timeZone="UTC" />,
    );

    expect(container.querySelector(".lifeos-project-card__logo")).toBeNull();
  });

  it("renders loading skeleton when loading is true", () => {
    renderWithUser(<ProjectCard loading />);
    expect(screen.getByText("Loading project card.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders archived state correctly", () => {
    const archivedProject: Project = {
      ...MOCK_PROJECT,
      archivedAt: "2026-08-19T10:00:00Z",
    };

    renderWithUser(
      <ProjectCard project={archivedProject} now={NOW} locale="en-US" timeZone="UTC" />,
    );

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
  });

  it("renders overdue state correctly", () => {
    const overdueProject: Project = {
      ...MOCK_PROJECT,
      deadlineDate: "2026-08-15",
    };

    renderWithUser(
      <ProjectCard project={overdueProject} now={NOW} locale="en-US" timeZone="UTC" />,
    );

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

    renderWithUser(
      <ProjectCard project={noTasksProject} now={NOW} locale="en-US" timeZone="UTC" />,
    );

    expect(screen.getByText("No tasks yet.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("triggers actions menu callback when selected", async () => {
    const onEdit = vi.fn();
    const onComplete = vi.fn();
    const onArchive = vi.fn();

    const { user } = renderWithUser(
      <ProjectCard
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
      <ProjectCard project={MOCK_PROJECT} now={NOW} locale="en-US" timeZone="UTC" />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
