import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";

import type { Habit } from "../model/habit";
import { HabitArchiveDialog } from "./HabitArchiveDialog";
import { HabitPauseDialog } from "./HabitPauseDialog";

const HABIT: Habit = {
  id: "habit-1",
  userId: "user-1",
  name: "Read",
  cadence: "DAILY",
  targetCount: 1,
  timeZone: "UTC",
  reminderEnabled: false,
  archived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  version: 0,
};

describe("Habit lifecycle dialogs", () => {
  it("creates bounded and open-ended pause requests with date validation", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(
      <HabitPauseDialog
        open
        habit={HABIT}
        defaultStartDate="2026-08-30"
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    await user.type(screen.getByLabelText("End date (optional)"), "2026-08-29");
    await user.click(screen.getByRole("button", { name: "Pause Habit" }));
    expect(
      screen.getAllByText("Choose an end date on or after the start date.").length,
    ).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("End date (optional)"));
    await user.type(screen.getByLabelText("Reason (optional)"), "Travel");
    await user.click(screen.getByRole("button", { name: "Pause Habit" }));
    expect(onSubmit).toHaveBeenCalledWith({
      startDate: "2026-08-30",
      endDate: null,
      reason: "Travel",
    });
    await expectNoAccessibilityViolations(container);
  });

  it("archives only after an explicit, recoverable consequence is shown", async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    const { container } = render(
      <HabitArchiveDialog open habit={HABIT} onClose={() => {}} onArchive={onArchive} />,
    );
    expect(screen.getByText(/you can restore it from Archived/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive Habit" }));
    expect(onArchive).toHaveBeenCalledWith(HABIT);
    await expectNoAccessibilityViolations(container);
  });
});
