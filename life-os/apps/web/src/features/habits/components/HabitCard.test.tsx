import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";

import type { Habit } from "../model/habit";
import { HabitCard } from "./HabitCard";
import { HabitRow } from "./HabitRow";

const HABIT: Habit = {
  id: "habit-1",
  userId: "user-1",
  name: "Read",
  description: "Read deliberately for a while.",
  cadence: "DAILY",
  targetCount: 2,
  timeZone: "Asia/Kolkata",
  color: "green",
  reminderEnabled: true,
  reminderTime: "20:00",
  archived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  version: 0,
};

describe("HabitCard and HabitRow", () => {
  it("renders factual Habit details, statistics, entry, and lifecycle actions", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onPause = vi.fn();
    const onArchive = vi.fn();
    const onIncrement = vi.fn();
    const { container } = render(
      <HabitCard
        habit={HABIT}
        localDate="2026-08-30"
        completedCount={1}
        statistics={{
          currentStreak: 4,
          longestStreak: 9,
          eligiblePeriods: 20,
          metTargetPeriods: 15,
          completionRate: 0.75,
        }}
        onEdit={onEdit}
        onPause={onPause}
        onArchive={onArchive}
        onIncrement={onIncrement}
      />,
    );

    expect(screen.getByText("2 times per day")).toBeInTheDocument();
    expect(screen.getByText("Asia/Kolkata")).toBeInTheDocument();
    expect(screen.getByText("8:00 PM")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Log habit" }));
    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(onIncrement).toHaveBeenCalledWith(HABIT, "2026-08-30");
    expect(onPause).toHaveBeenCalledWith(HABIT);
    expect(onArchive).toHaveBeenCalledWith(HABIT);
    await expectNoAccessibilityViolations(container);
  });

  it("shows paused and archived actions plus loading, error, and empty states", async () => {
    const onResume = vi.fn();
    const { rerender } = render(<HabitCard habit={HABIT} paused onResume={onResume} />);
    await userEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledWith(HABIT);

    const archivedHabit = { ...HABIT, archived: true };
    const onRestore = vi.fn();
    rerender(<HabitCard habit={archivedHabit} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(onRestore).toHaveBeenCalledWith(archivedHabit);

    rerender(<HabitCard loading />);
    expect(document.querySelector(".lifeos-skeleton-card")).toBeInTheDocument();

    rerender(<HabitCard error="Other Habits are still available." />);
    expect(screen.getByText("This Habit couldn't load")).toBeInTheDocument();

    rerender(<HabitCard />);
    expect(screen.getByText("No Habit selected")).toBeInTheDocument();
  });

  it("renders a responsive row with exact accessible action names", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();
    const onEdit = vi.fn();
    const onArchive = vi.fn();
    const { container } = render(
      <HabitRow
        habit={HABIT}
        localDate="2026-08-30"
        completedCount={1}
        onLog={onLog}
        onEdit={onEdit}
        onArchive={onArchive}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Log habit" }));
    await user.click(screen.getByRole("button", { name: "Edit Read" }));
    await user.click(screen.getByRole("button", { name: "Archive Read" }));
    expect(onLog).toHaveBeenCalledWith(HABIT, "2026-08-30");
    expect(onEdit).toHaveBeenCalledWith(HABIT);
    expect(onArchive).toHaveBeenCalledWith(HABIT);
    await expectNoAccessibilityViolations(container);
  });
});
