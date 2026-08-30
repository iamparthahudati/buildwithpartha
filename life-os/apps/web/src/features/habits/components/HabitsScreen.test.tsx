import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";

import type { Habit } from "../model/habit";
import { HabitsScreen } from "./HabitsScreen";

const HABIT: Habit = {
  id: "habit-1",
  userId: "user-1",
  name: "Read",
  cadence: "DAILY",
  targetCount: 2,
  timeZone: "Asia/Kolkata",
  reminderEnabled: false,
  archived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  version: 0,
};

function props() {
  return {
    habits: [HABIT],
    archivedHabits: [],
    dayStates: new Map([[HABIT.id, { count: 1, paused: false }]]),
    date: "2026-08-30",
    view: "today" as const,
    onRetry: vi.fn(),
    onDateChange: vi.fn(),
    onViewChange: vi.fn(),
    onAdd: vi.fn(),
    onSelect: vi.fn(),
    onIncrement: vi.fn(),
    onDecrement: vi.fn(),
    onEdit: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
  };
}

describe("HabitsScreen", () => {
  it("composes the Today view with a URL-owned local date and accessible controls", async () => {
    const screenProps = props();
    const { container } = render(<HabitsScreen {...screenProps} />);

    expect(screen.getByRole("heading", { level: 1, name: "Habits" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Today", selected: true })).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-08-30")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Log habit" }));
    expect(screenProps.onIncrement).toHaveBeenCalledWith(HABIT, "2026-08-30");
    await expectNoAccessibilityViolations(container);
  });

  it("delegates list view and date state changes to the route", async () => {
    const screenProps = props();
    render(<HabitsScreen {...screenProps} />);

    await userEvent.click(screen.getByRole("tab", { name: "All Habits" }));
    expect(screenProps.onViewChange).toHaveBeenCalledWith("list");
    fireEvent.change(screen.getByLabelText("Habit date"), { target: { value: "2026-08-29" } });
    expect(screenProps.onDateChange).toHaveBeenLastCalledWith("2026-08-29");
  });
});
