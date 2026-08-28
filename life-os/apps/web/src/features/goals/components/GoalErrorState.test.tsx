import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalErrorState } from "./GoalErrorState";

describe("GoalErrorState", () => {
  it("renders error state with retry trigger and passes accessibility check", async () => {
    const onRetry = vi.fn();
    const { container } = render(<GoalErrorState message="Network error" onRetry={onRetry} />);

    expect(screen.getByText("Unable to load goals")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: "Try again" });
    await userEvent.click(btn);
    expect(onRetry).toHaveBeenCalled();

    await expectNoAccessibilityViolations(container);
  });
});
