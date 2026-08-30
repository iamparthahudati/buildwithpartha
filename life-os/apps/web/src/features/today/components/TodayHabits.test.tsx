import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TodayHabits, type TodayHabitItem } from "./TodayHabits";

const HABIT: TodayHabitItem = {
  id: "habit-1",
  name: "Read",
  cadence: "DAILY",
  targetCount: 2,
  completedCount: 1,
  localDate: "2026-08-30",
  timeZone: "Asia/Kolkata",
  paused: false,
  currentStreak: 3,
};

describe("TodayHabits", () => {
  it("logs and removes absolute counts for the Habit local date", async () => {
    const onSetCount = vi.fn();
    const { user } = renderWithUser(
      <TodayHabits
        status={{ type: "ready", habits: [HABIT] }}
        habitsHref="/life-os/app/habits"
        onSetCount={onSetCount}
      />,
    );

    expect(screen.getByText(/1 of 2 on 2026-08-30/)).toBeInTheDocument();
    expect(screen.getByText(/3 periods/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add one Read completion" }));
    expect(onSetCount).toHaveBeenCalledWith(HABIT, 2);
    await user.click(screen.getByRole("button", { name: "Remove one Read completion" }));
    expect(onSetCount).toHaveBeenCalledWith(HABIT, 0);
  });

  it("disables entry controls while the Habit is paused", () => {
    renderWithUser(
      <TodayHabits
        status={{ type: "ready", habits: [{ ...HABIT, paused: true }] }}
        habitsHref="/life-os/app/habits"
        onSetCount={() => {}}
      />,
    );

    expect(screen.getByText(/Paused for this local date/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add one Read completion" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove one Read completion" })).toBeDisabled();
  });

  it("renders loading, empty, error, and accessible ready states", async () => {
    const { container, rerender } = renderWithUser(
      <TodayHabits
        status={{ type: "loading" }}
        habitsHref="/life-os/app/habits"
        onSetCount={() => {}}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading Habits");

    rerender(
      <TodayHabits
        status={{ type: "ready", habits: [] }}
        habitsHref="/life-os/app/habits"
        onSetCount={() => {}}
      />,
    );
    expect(screen.getByText("No active Habits")).toBeInTheDocument();

    rerender(
      <TodayHabits
        status={{ type: "error", message: "Habits couldn't load." }}
        habitsHref="/life-os/app/habits"
        onSetCount={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Habits couldn't load");

    rerender(
      <TodayHabits
        status={{ type: "ready", habits: [HABIT] }}
        habitsHref="/life-os/app/habits"
        onSetCount={() => {}}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
