import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalsScreen } from "./GoalsScreen";
import type { Goal } from "../model/goal";

const MOCK_GOALS: readonly Goal[] = [
  {
    id: "goal-1",
    userId: "user-1",
    title: "Read 12 Books",
    description: "Read 1 book per month",
    category: "LEARNING",
    progressType: "NUMERIC",
    targetValue: 12,
    currentValue: 4,
    unit: "books",
    targetDate: "2026-12-31",
    status: "IN_PROGRESS",
    checkInCadence: "MONTHLY",
    archived: false,
    progressPercentage: 33,
  },
  {
    id: "goal-2",
    userId: "user-1",
    title: "Run Marathon",
    description: "Train for autumn marathon",
    category: "HEALTH",
    progressType: "PERCENTAGE",
    targetValue: 100,
    currentValue: 50,
    targetDate: "2026-10-15",
    status: "IN_PROGRESS",
    checkInCadence: "WEEKLY",
    archived: false,
    progressPercentage: 50,
  },
];

describe("GoalsScreen", () => {
  it("renders goals screen layout, metrics, tabs, and goal cards", async () => {
    const onStatusTabChange = vi.fn();
    const onCreateGoal = vi.fn();

    const { container } = render(
      <GoalsScreen
        goals={MOCK_GOALS}
        summaryCounts={{
          totalGoals: 2,
          activeGoals: 2,
          completedGoals: 0,
          pausedGoals: 0,
          archivedGoals: 0,
          averageProgressPercentage: 42,
        }}
        onStatusTabChange={onStatusTabChange}
        onCreateGoal={onCreateGoal}
      />,
    );

    expect(screen.getByRole("heading", { name: "Goals" })).toBeInTheDocument();
    expect(screen.getByText("Read 12 Books")).toBeInTheDocument();
    expect(screen.getByText("Run Marathon")).toBeInTheDocument();

    const newGoalBtn = screen.getByRole("button", { name: /New Goal/i });
    await userEvent.click(newGoalBtn);
    expect(screen.getByRole("heading", { name: "Create goal" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders empty state when goals list is empty", async () => {
    const { container } = render(<GoalsScreen goals={[]} />);

    expect(screen.getByText("No goals set yet")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("renders error state when error is provided", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <GoalsScreen goals={[]} error="Failed to fetch goals" onRetry={onRetry} />,
    );

    expect(screen.getByText("Unable to load goals")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Try again/i });
    await userEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();

    await expectNoAccessibilityViolations(container);
  });
});
