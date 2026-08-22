import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayActiveProjects, type TodayActiveProjectsProps } from "./TodayActiveProjects";

const PROJECTS = [
  {
    id: "project-1",
    name: "LifeOS launch",
    href: "/life-os/app/projects/project-1",
    completedTasksCount: 3,
    totalTasksCount: 5,
  },
  {
    id: "project-2",
    name: "Website refresh",
    href: "/life-os/app/projects/project-2",
    completedTasksCount: 1,
    totalTasksCount: 4,
  },
  {
    id: "project-3",
    name: "Reading notes",
    href: "/life-os/app/projects/project-3",
    completedTasksCount: 0,
    totalTasksCount: 0,
  },
  {
    id: "project-4",
    name: "Home office",
    href: "/life-os/app/projects/project-4",
    completedTasksCount: 2,
    totalTasksCount: 2,
  },
] as const;

const BASE_PROPS: Omit<TodayActiveProjectsProps, "status"> = {
  sourceLabel: "Active projects and their task progress",
  projectsHref: "/life-os/app/projects",
};

describe("TodayActiveProjects", () => {
  it("shows a limited active Project list and a path to the canonical inventory", () => {
    renderWithUser(
      <TodayActiveProjects {...BASE_PROPS} status={{ type: "ready", projects: PROJECTS }} />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Active projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      BASE_PROPS.projectsHref,
    );
    expect(screen.getByRole("link", { name: "Open project: LifeOS launch" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open project: Reading notes" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open project: Home office" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Source: Active projects and their task progress")).toBeInTheDocument();
  });

  it("reserves three rows and announces loading once", () => {
    const { container } = renderWithUser(
      <TodayActiveProjects {...BASE_PROPS} status={{ type: "loading" }} />,
    );

    expect(screen.getByRole("status", { name: "Loading active projects" })).toHaveTextContent(
      "Loading active projects.",
    );
    expect(container.querySelectorAll(".lifeos-skeleton-card")).toHaveLength(3);
  });

  it("offers the caller's add action in the honest first-use state", async () => {
    const onAddProject = vi.fn();
    const { user } = renderWithUser(
      <TodayActiveProjects
        {...BASE_PROPS}
        status={{ type: "empty" }}
        onAddProject={onAddProject}
      />,
    );

    expect(screen.getByText("No active projects yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add project" }));
    expect(onAddProject).toHaveBeenCalledTimes(1);
  });

  it("isolates an error and retries when a recovery action is available", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <TodayActiveProjects
        {...BASE_PROPS}
        status={{ type: "error", message: "Other Today sections are still available." }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Active projects couldn't load.")).toBeInTheDocument();
    expect(screen.getByText("Other Today sections are still available.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations across ready, empty, loading, and error states", async () => {
    const { container, rerender } = renderWithUser(
      <TodayActiveProjects {...BASE_PROPS} status={{ type: "ready", projects: PROJECTS }} />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<TodayActiveProjects {...BASE_PROPS} status={{ type: "empty" }} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TodayActiveProjects {...BASE_PROPS} status={{ type: "loading" }} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <TodayActiveProjects
        {...BASE_PROPS}
        status={{ type: "error", message: "Other Today sections are still available." }}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
