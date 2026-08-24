import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import type { WeekDayPlan } from "../model/weekPlanner";
import { WeekDayCapacityDialog } from "./WeekDayCapacityDialog";

const SAMPLE_DAY: WeekDayPlan = {
  localDate: "2026-08-17",
  dayOfWeek: "Mon",
  plannedMinutes: 600,
  availableMinutes: 480,
  totalTasksCount: 5,
  completedTasksCount: 2,
};

describe("WeekDayCapacityDialog", () => {
  it("renders capacity adjustment form with day details and workload impact", () => {
    renderWithUser(
      <WeekDayCapacityDialog
        open
        day={SAMPLE_DAY}
        onClose={() => {}}
        onSubmit={() => {}}
        locale="en-US"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Adjust Capacity for Monday, August 17, 2026" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Available Capacity (Hours)")).toHaveValue(8);
    expect(screen.getByText("Planned workload:")).toBeInTheDocument();
    expect(screen.getByText("10h")).toBeInTheDocument();
    expect(screen.getByText("Exceeds capacity by 2h")).toBeInTheDocument();
  });

  it("submits updated available minutes when valid hours are provided", async () => {
    const handleSubmit = vi.fn();
    const { user } = renderWithUser(
      <WeekDayCapacityDialog
        open
        day={SAMPLE_DAY}
        onClose={() => {}}
        onSubmit={handleSubmit}
        locale="en-US"
      />,
    );

    const input = screen.getByLabelText("Available Capacity (Hours)");
    await user.clear(input);
    await user.type(input, "10");

    const submitBtn = screen.getByRole("button", { name: "Save capacity" });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith("2026-08-17", 600); // 10 hours = 600 minutes
  });

  it("validates input boundaries", async () => {
    const handleSubmit = vi.fn();
    const { user } = renderWithUser(
      <WeekDayCapacityDialog
        open
        day={SAMPLE_DAY}
        onClose={() => {}}
        onSubmit={handleSubmit}
        locale="en-US"
      />,
    );

    const input = screen.getByLabelText("Available Capacity (Hours)");
    await user.clear(input);
    await user.type(input, "28");

    const submitBtn = screen.getByRole("button", { name: "Save capacity" });
    await user.click(submitBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getAllByText("Available capacity hours cannot exceed 24 hours per day.")[0],
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithUser(
      <WeekDayCapacityDialog
        open
        day={SAMPLE_DAY}
        onClose={() => {}}
        onSubmit={() => {}}
        locale="en-US"
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
