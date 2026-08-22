import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ActiveProjectRow, type TodayActiveProject } from "./ActiveProjectRow";

const PROJECT: TodayActiveProject = {
  id: "project-1",
  name: "LifeOS launch",
  href: "/life-os/app/projects/project-1",
  completedTasksCount: 3,
  totalTasksCount: 5,
};

describe("ActiveProjectRow", () => {
  it("renders a semantic Project link and canonical task progress", () => {
    renderWithUser(
      <ul>
        <ActiveProjectRow project={PROJECT} />
      </ul>,
    );

    expect(screen.getByRole("link", { name: "Open project: LifeOS launch" })).toHaveAttribute(
      "href",
      PROJECT.href,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();

    const progress = screen.getByRole("progressbar", { name: "LifeOS launch progress" });
    expect(progress).toHaveAttribute("aria-valuenow", "3");
    expect(progress).toHaveAttribute("aria-valuemax", "5");
    expect(progress).toHaveAttribute("aria-valuetext", "3 of 5 tasks done");
  });

  it("does not invent a percentage when a Project has no tasks", () => {
    renderWithUser(
      <ul>
        <ActiveProjectRow project={{ ...PROJECT, completedTasksCount: 0, totalTasksCount: 0 }} />
      </ul>,
    );

    expect(screen.getByText("No tasks yet.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("clamps inconsistent counts instead of announcing impossible progress", () => {
    renderWithUser(
      <ul>
        <ActiveProjectRow project={{ ...PROJECT, completedTasksCount: 8, totalTasksCount: 5 }} />
      </ul>,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "5 of 5 tasks done");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <ul>
        <ActiveProjectRow project={PROJECT} />
      </ul>,
    );
    await expectNoAccessibilityViolations(container);
  });
});
