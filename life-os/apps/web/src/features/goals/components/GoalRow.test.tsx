import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalRow } from "./GoalRow";
import type { Goal } from "../model/goal";

const MOCK_GOAL: Goal = {
  id: "goal-2",
  userId: "user-1",
  title: "Read 12 Books",
  category: "Personal",
  progressType: "NUMERIC",
  targetValue: 12,
  currentValue: 6,
  unit: "books",
  status: "IN_PROGRESS",
  checkInCadence: "MONTHLY",
  archived: false,
  progressPercentage: 50,
};

describe("GoalRow", () => {
  it("renders goal row and handles selection/check-in actions", async () => {
    const onSelect = vi.fn();
    const onCheckIn = vi.fn();
    const onPause = vi.fn();
    const onComplete = vi.fn();
    const onEdit = vi.fn();
    const onArchive = vi.fn();

    const { container } = render(
      <GoalRow
        goal={MOCK_GOAL}
        onSelect={onSelect}
        onCheckIn={onCheckIn}
        onPause={onPause}
        onComplete={onComplete}
        onEdit={onEdit}
        onArchive={onArchive}
      />,
    );

    expect(screen.getByText("Read 12 Books")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("50% (6 / 12 books)")).toBeInTheDocument();

    const checkInBtn = screen.getByRole("button", { name: "Check In" });
    await userEvent.click(checkInBtn);
    expect(onCheckIn).toHaveBeenCalledWith(MOCK_GOAL);

    const pauseBtn = screen.getByRole("button", { name: "Pause" });
    await userEvent.click(pauseBtn);
    expect(onPause).toHaveBeenCalledWith(MOCK_GOAL);

    const completeBtn = screen.getByRole("button", { name: "Complete" });
    await userEvent.click(completeBtn);
    expect(onComplete).toHaveBeenCalledWith(MOCK_GOAL);

    const editBtn = screen.getByRole("button", { name: "Edit" });
    await userEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(MOCK_GOAL);

    const archiveBtn = screen.getByRole("button", { name: "Archive" });
    await userEvent.click(archiveBtn);
    expect(onArchive).toHaveBeenCalledWith(MOCK_GOAL);

    await expectNoAccessibilityViolations(container);
  });

  it("handles keyboard selection and resume action for PAUSED goals", async () => {
    const pausedGoal: Goal = { ...MOCK_GOAL, status: "PAUSED" };
    const onClick = vi.fn();
    const onResume = vi.fn();

    render(<GoalRow goal={pausedGoal} onClick={onClick} onResume={onResume} />);

    const row = screen.getByRole("button", { name: "Select Read 12 Books" });
    row.focus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledWith(pausedGoal);

    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);

    const resumeBtn = screen.getByRole("button", { name: "Resume" });
    await userEvent.click(resumeBtn);
    expect(onResume).toHaveBeenCalledWith(pausedGoal);
  });
});
