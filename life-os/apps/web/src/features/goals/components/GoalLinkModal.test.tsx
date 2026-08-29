import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalLinkModal } from "./GoalLinkModal";

describe("GoalLinkModal", () => {
  it("renders modal and submits target link", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <GoalLinkModal open={true} onClose={onClose} onSubmit={onSubmit} />,
    );

    expect(screen.getByRole("heading", { name: "Link Work Item" })).toBeInTheDocument();

    const idInput = screen.getByLabelText(/Work item ID or reference/i);
    await userEvent.type(idInput, "proj-123");

    const submitBtn = screen.getByRole("button", { name: "Add Link" });
    await userEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith("PROJECT", "proj-123");
    await expectNoAccessibilityViolations(container);
  });

  it("validates empty target ID", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(<GoalLinkModal open={true} onClose={onClose} onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole("button", { name: "Add Link" });
    await userEvent.click(submitBtn);

    expect(screen.getAllByText("Target ID or reference is required.").length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
