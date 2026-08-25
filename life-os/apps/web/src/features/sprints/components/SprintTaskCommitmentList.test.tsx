import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { SprintTaskCommitmentList } from "./SprintTaskCommitmentList";
import type { SprintTask } from "../model/sprint";

const MOCK_TASKS: readonly SprintTask[] = [
  {
    id: "st-1",
    sprintId: "sprint-1",
    taskId: "task-1",
    title: "Build SprintCard component",
    status: "DONE",
    storyPoints: 5,
    projectName: "LifeOS Web",
    priority: "P2",
    isCommitted: true,
  },
  {
    id: "st-2",
    sprintId: "sprint-1",
    taskId: "task-2",
    title: "Build SprintFormDialog",
    status: "IN_PROGRESS",
    storyPoints: 8,
    projectName: "LifeOS Web",
    priority: "P3",
    isCommitted: false,
  },
];

describe("SprintTaskCommitmentList", () => {
  it("renders task commitments list and summary metrics", async () => {
    const onToggle = vi.fn();
    const onRemove = vi.fn();
    const { container } = render(
      <SprintTaskCommitmentList
        tasks={MOCK_TASKS}
        onToggleTaskStatus={onToggle}
        onRemoveTask={onRemove}
      />,
    );

    expect(screen.getByText("Task Commitments (2)")).toBeInTheDocument();
    expect(screen.getByText("5 of 13 story points completed")).toBeInTheDocument();
    expect(screen.getByText("Build SprintCard component")).toBeInTheDocument();
    expect(screen.getByText("Build SprintFormDialog")).toBeInTheDocument();
    expect(screen.getByText("Committed")).toBeInTheDocument();
    expect(screen.getByText("Scope Addition")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("handles status toggle and remove actions", async () => {
    const onToggle = vi.fn();
    const onRemove = vi.fn();

    render(
      <SprintTaskCommitmentList
        tasks={MOCK_TASKS}
        onToggleTaskStatus={onToggle}
        onRemoveTask={onRemove}
      />,
    );

    const toggleBtn = screen.getByRole("button", {
      name: "Mark task Build SprintCard component as to do",
    });
    await userEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledWith("st-1", "DONE");

    const removeBtn = screen.getByRole("button", {
      name: "Remove Build SprintCard component from sprint",
    });
    await userEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith("st-1");
  });

  it("renders empty state when tasks list is empty", () => {
    render(<SprintTaskCommitmentList tasks={[]} />);
    expect(screen.getByText("No tasks committed")).toBeInTheDocument();
  });
});
