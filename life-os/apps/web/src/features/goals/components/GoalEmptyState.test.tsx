import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalEmptyState } from "./GoalEmptyState";

describe("GoalEmptyState", () => {
  it("renders empty state with creation trigger and passes accessibility check", async () => {
    const onCreate = vi.fn();
    const { container } = render(<GoalEmptyState onCreateGoal={onCreate} />);

    expect(screen.getByText("No goals set yet")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Create Your First Goal" });
    await userEvent.click(btn);
    expect(onCreate).toHaveBeenCalled();

    await expectNoAccessibilityViolations(container);
  });
});
