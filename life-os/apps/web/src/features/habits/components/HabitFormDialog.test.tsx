import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";

import { HabitFormDialog } from "./HabitFormDialog";

describe("HabitFormDialog", () => {
  it("validates required values and submits canonical Habit form data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<HabitFormDialog open onClose={() => {}} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Add Habit" }));
    expect(screen.getAllByText("Enter a Habit name.").length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Habit name"), "Read");
    await user.clear(screen.getByLabelText("Target count"));
    await user.type(screen.getByLabelText("Target count"), "2");
    await user.selectOptions(screen.getByLabelText("Cadence"), "WEEKLY");
    await user.selectOptions(screen.getByLabelText("Timezone"), "Asia/Kolkata");
    await user.click(screen.getByLabelText("Enable a LifeOS reminder"));
    await user.click(screen.getByRole("button", { name: "Add Habit" }));
    expect(
      screen.getAllByText("Choose a reminder time or turn the reminder off.").length,
    ).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Reminder time"), "20:00");
    await user.click(screen.getByRole("button", { name: "Add Habit" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Read",
      description: null,
      cadence: "WEEKLY",
      targetCount: 2,
      timeZone: "Asia/Kolkata",
      color: "blue",
      reminderEnabled: true,
      reminderTime: "20:00",
    });
    await expectNoAccessibilityViolations(container);
  });

  it("loads edit values, preserves versions, and offers conflict recovery", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onLoadLatest = vi.fn();
    render(
      <HabitFormDialog
        open
        mode="edit"
        initialValues={{
          name: "Walk",
          description: "A short outside walk.",
          cadence: "DAILY",
          targetCount: 1,
          timeZone: "UTC",
          color: "green",
          reminderEnabled: false,
          version: 4,
        }}
        conflictError="Your edits are still here. Load the latest Habit before saving again."
        onLoadLatest={onLoadLatest}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole("heading", { name: "Edit Habit" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Walk")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load latest" }));
    expect(onLoadLatest).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Walk", version: 4 }));
  });

  it("keeps reminder controls disabled and explicit while a save is pending", () => {
    render(
      <HabitFormDialog
        open
        pending
        initialValues={{ reminderEnabled: true, reminderTime: "09:00" }}
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByLabelText("Enable a LifeOS reminder")).toBeDisabled();
    expect(screen.getByLabelText("Reminder time")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Habit" })).toHaveAttribute("aria-busy", "true");
  });
});
