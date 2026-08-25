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

    const { container } = render(
      <GoalRow goal={MOCK_GOAL} onSelect={onSelect} onCheckIn={onCheckIn} />,
    );

    expect(screen.getByText("Read 12 Books")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("50% (6 / 12 books)")).toBeInTheDocument();

    const checkInBtn = screen.getByRole("button", { name: "Check In" });
    await userEvent.click(checkInBtn);
    expect(onCheckIn).toHaveBeenCalledWith(MOCK_GOAL);

    await expectNoAccessibilityViolations(container);
  });
});
