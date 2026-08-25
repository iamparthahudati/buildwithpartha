import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalCard } from "./GoalCard";
import type { Goal } from "../model/goal";

const MOCK_GOAL: Goal = {
  id: "goal-1",
  userId: "user-1",
  title: "Master TypeScript & React Patterns",
  description: "Build robust modular components with test coverage",
  category: "Learning",
  progressType: "PERCENTAGE",
  targetValue: 100,
  currentValue: 60,
  targetDate: "2026-12-31",
  status: "IN_PROGRESS",
  checkInCadence: "WEEKLY",
  archived: false,
  progressPercentage: 60,
};

describe("GoalCard", () => {
  it("renders goal card details, badges, and triggers actions", async () => {
    const onCheckIn = vi.fn();
    const onPause = vi.fn();
    const onComplete = vi.fn();
    const onEdit = vi.fn();
    const onArchive = vi.fn();

    const { container } = render(
      <GoalCard
        goal={MOCK_GOAL}
        linkedWorkCount={2}
        onCheckIn={onCheckIn}
        onPause={onPause}
        onComplete={onComplete}
        onEdit={onEdit}
        onArchive={onArchive}
      />,
    );

    expect(screen.getByText("Master TypeScript & React Patterns")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Learning")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("2 items")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Check In" }));
    expect(onCheckIn).toHaveBeenCalledWith(MOCK_GOAL);

    await userEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(onPause).toHaveBeenCalledWith(MOCK_GOAL);

    await userEvent.click(screen.getByRole("button", { name: "Mark Complete" }));
    expect(onComplete).toHaveBeenCalledWith(MOCK_GOAL);

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(MOCK_GOAL);

    await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalledWith(MOCK_GOAL);

    await expectNoAccessibilityViolations(container);
  });

  it("renders paused goal with resume action", async () => {
    const pausedGoal: Goal = { ...MOCK_GOAL, status: "PAUSED" };
    const onResume = vi.fn();

    render(<GoalCard goal={pausedGoal} onResume={onResume} />);
    expect(screen.getByText("Paused")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledWith(pausedGoal);
  });

  it("renders loading and error states cleanly", async () => {
    const { container: loadingContainer } = render(<GoalCard loading />);
    expect(loadingContainer.querySelector(".goal-card")).toBeNull();

    const onRetry = vi.fn();
    const { container: errorContainer } = render(
      <GoalCard error="Failed to fetch goal" onRetry={onRetry} />,
    );
    expect(screen.getByText("Unable to load goal")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();

    await expectNoAccessibilityViolations(errorContainer);
  });
});
