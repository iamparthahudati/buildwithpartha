import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";

import type { Habit } from "../model/habit";
import { HabitEntryControl } from "./HabitEntryControl";

const HABIT: Habit = {
  id: "habit-1",
  userId: "user-1",
  name: "Read",
  description: "Read deliberately for a while.",
  cadence: "DAILY",
  targetCount: 2,
  timeZone: "Asia/Kolkata",
  color: "blue",
  reminderEnabled: true,
  reminderTime: "20:00",
  archived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  version: 0,
};

describe("HabitEntryControl", () => {
  it("logs and removes completions with the Habit and local date", async () => {
    const user = userEvent.setup();
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();
    const { container } = render(
      <HabitEntryControl
        habit={HABIT}
        localDate="2026-08-30"
        completedCount={1}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Log habit" }));
    await user.click(
      screen.getByRole("button", {
        name: "Remove one completion from Read on Sun, Aug 30",
      }),
    );
    expect(onIncrement).toHaveBeenCalledWith(HABIT, "2026-08-30");
    expect(onDecrement).toHaveBeenCalledWith(HABIT, "2026-08-30");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "1 of 2 completions logged",
    );
    await expectNoAccessibilityViolations(container);
  });

  it("explains paused, archived, loading, complete, and recoverable error states", async () => {
    const { rerender } = render(
      <HabitEntryControl habit={HABIT} localDate="2026-08-30" completedCount={0} paused />,
    );
    expect(screen.getByText("This Habit is paused on this date.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log habit" })).toBeDisabled();

    rerender(
      <HabitEntryControl
        habit={{ ...HABIT, archived: true }}
        localDate="2026-08-30"
        completedCount={0}
      />,
    );
    expect(screen.getByText("Restore this Habit before logging entries.")).toBeInTheDocument();

    rerender(<HabitEntryControl habit={HABIT} localDate="2026-08-30" completedCount={2} />);
    expect(screen.getByText("Target met for this period.")).toBeInTheDocument();

    const onRetry = vi.fn();
    rerender(
      <HabitEntryControl
        habit={HABIT}
        localDate="2026-08-30"
        completedCount={1}
        error="The entry couldn't be saved. The confirmed count is still shown."
        onRetry={onRetry}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<HabitEntryControl habit={HABIT} localDate="2026-08-30" completedCount={0} loading />);
    expect(screen.getByLabelText("Loading Read entry for Sun, Aug 30")).toBeInTheDocument();
  });
});
