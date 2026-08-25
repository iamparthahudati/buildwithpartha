import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalDetailsScreen } from "./GoalDetailsScreen";
import type { Goal, GoalCheckIn, GoalLink } from "../model/goal";

const MOCK_GOAL: Goal = {
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
  version: 2,
};

const MOCK_CHECKINS: readonly GoalCheckIn[] = [
  {
    id: "checkin-1",
    goalId: "goal-1",
    userId: "user-1",
    value: 4,
    note: "Finished book 4",
    recordedAt: "2026-08-20T12:00:00Z",
  },
];

const MOCK_LINKS: readonly GoalLink[] = [
  {
    id: "link-1",
    goalId: "goal-1",
    userId: "user-1",
    targetType: "PROJECT",
    targetId: "proj-1",
    targetTitle: "Reading List App",
  },
];

describe("GoalDetailsScreen", () => {
  it("renders goal detail view, overview, progress, check-in history, and linked work", async () => {
    const onGoBack = vi.fn();
    const onCheckIn = vi.fn();

    const { container } = render(
      <GoalDetailsScreen
        goal={MOCK_GOAL}
        checkIns={MOCK_CHECKINS}
        links={MOCK_LINKS}
        onGoBack={onGoBack}
        onCheckIn={onCheckIn}
      />,
    );

    expect(screen.getByText("Read 12 Books")).toBeInTheDocument();
    expect(screen.getByText("Finished book 4")).toBeInTheDocument();
    expect(screen.getByText("Reading List App")).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /Back to Goals/i });
    await userEvent.click(backBtn);
    expect(onGoBack).toHaveBeenCalled();

    await expectNoAccessibilityViolations(container);
  });

  it("renders not found state when notFound is true", async () => {
    const onGoBack = vi.fn();
    const { container } = render(<GoalDetailsScreen notFound onGoBack={onGoBack} />);

    expect(screen.getByText("Goal not found")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("renders error state when error is provided", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <GoalDetailsScreen error={new Error("Network failed")} onRetry={onRetry} />,
    );

    expect(screen.getByText("Failed to load goal")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });
});
