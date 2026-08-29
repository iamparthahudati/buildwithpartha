import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { ProgressEditor } from "./ProgressEditor";
import type { Goal } from "../model/goal";

const MOCK_NUMERIC_GOAL: Goal = {
  id: "goal-3",
  userId: "user-1",
  title: "Run 100 Miles",
  category: "Health",
  progressType: "NUMERIC",
  targetValue: 100,
  currentValue: 40,
  unit: "miles",
  status: "IN_PROGRESS",
  checkInCadence: "WEEKLY",
  archived: false,
  progressPercentage: 40,
};

const MOCK_BINARY_GOAL: Goal = {
  id: "goal-binary",
  userId: "user-1",
  title: "File Annual Tax Returns",
  category: "Finance",
  progressType: "BINARY",
  targetValue: 1,
  currentValue: 0,
  status: "NOT_STARTED",
  checkInCadence: "MANUAL",
  archived: false,
  progressPercentage: 0,
};

describe("ProgressEditor", () => {
  it("renders calculation explanation, quick increment buttons, and submits new progress", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(
      <ProgressEditor
        goal={MOCK_NUMERIC_GOAL}
        linkedWorkCount={1}
        onSaveProgress={onSave}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Update Goal Progress")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Progress is calculated as current value \(40 miles\) divided by target \(100 miles\) = 40%./i,
      ),
    ).toBeInTheDocument();

    const addFiveBtn = screen.getByRole("button", { name: "+5" });
    await userEvent.click(addFiveBtn);

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await userEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();

    const submitBtn = screen.getByRole("button", { name: "Save Progress Check-in" });
    await userEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledWith(45, undefined);
    await expectNoAccessibilityViolations(container);
  });

  it("handles binary goal progress checkbox", async () => {
    const onSave = vi.fn();
    render(<ProgressEditor goal={MOCK_BINARY_GOAL} onSaveProgress={onSave} />);

    const checkbox = screen.getByRole("checkbox", { name: "Mark Goal Complete" });
    await userEvent.click(checkbox);

    const submitBtn = screen.getByRole("button", { name: "Save Progress Check-in" });
    await userEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledWith(1, undefined);
  });
});
