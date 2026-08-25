import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { CheckInFormDialog } from "./CheckInFormDialog";
import type { Goal } from "../model/goal";

const MOCK_GOAL: Goal = {
  id: "goal-4",
  userId: "user-1",
  title: "Publish 5 Blog Posts",
  category: "Writing",
  progressType: "MILESTONE",
  targetValue: 5,
  currentValue: 2,
  unit: "posts",
  status: "IN_PROGRESS",
  checkInCadence: "WEEKLY",
  archived: false,
  progressPercentage: 40,
};

describe("CheckInFormDialog", () => {
  it("renders check-in modal form and submits valid check-in data", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    const { container } = render(
      <CheckInFormDialog open={true} onClose={onClose} onSubmit={onSubmit} goal={MOCK_GOAL} />,
    );

    expect(screen.getByText("Check In: Publish 5 Blog Posts")).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "Record Check-in" });
    await userEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(2, undefined);
    await expectNoAccessibilityViolations(container);
  });
});
