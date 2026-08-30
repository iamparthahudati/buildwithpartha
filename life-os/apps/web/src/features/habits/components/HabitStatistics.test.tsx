import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";

import { HabitHeatmap } from "./HabitHeatmap";
import { HabitStreakSummary } from "./HabitStreakSummary";

const DAYS = [
  { localDate: "2026-08-27", completedCount: 0, targetCount: 1 },
  { localDate: "2026-08-28", completedCount: 1, targetCount: 1 },
  { localDate: "2026-08-29", completedCount: 2, targetCount: 1 },
  { localDate: "2026-08-30", completedCount: 0, targetCount: 1, paused: true },
] as const;

describe("Habit statistics components", () => {
  it("shows streak and consistency calculations without judging misses", async () => {
    const { container } = render(
      <HabitStreakSummary
        status={{
          type: "ready",
          statistics: {
            currentStreak: 2,
            longestStreak: 6,
            eligiblePeriods: 10,
            metTargetPeriods: 7,
            completionRate: 0.7,
          },
        }}
        cadenceLabel="days"
      />,
    );
    expect(screen.getByText("Current streak")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("7 of 10 days")).toBeInTheDocument();
    expect(screen.getByText("Paused periods excluded")).toBeInTheDocument();
    expect(screen.queryByText(/failed|broke/i)).not.toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("supports loading, empty, and recoverable error streak states", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<HabitStreakSummary status={{ type: "loading" }} />);
    expect(screen.getByText("Loading Habit statistics…")).toBeInTheDocument();
    rerender(<HabitStreakSummary status={{ type: "empty" }} />);
    expect(screen.getAllByText("No history yet").length).toBe(4);
    rerender(
      <HabitStreakSummary
        status={{ type: "error", message: "Habit details are still available.", onRetry }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders a heatmap summary and replaces it with a real table alternative", async () => {
    const user = userEvent.setup();
    const { container } = render(<HabitHeatmap status="ready" days={DAYS} />);
    expect(
      screen.getByRole("img", { name: /2 of 3 shown local dates met the target/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View as table" }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Aug 30, 2026" })).toBeInTheDocument();
    expect(screen.getByText("Paused")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("shows heatmap loading, empty, and error states", () => {
    const { rerender } = render(<HabitHeatmap status="loading" />);
    expect(screen.getByText("Loading Habit consistency…")).toBeInTheDocument();
    rerender(<HabitHeatmap status="empty" />);
    expect(screen.getByText("Not enough Habit history yet")).toBeInTheDocument();
    rerender(<HabitHeatmap status="error" />);
    expect(screen.getByText("Habit consistency couldn't load")).toBeInTheDocument();
  });
});
