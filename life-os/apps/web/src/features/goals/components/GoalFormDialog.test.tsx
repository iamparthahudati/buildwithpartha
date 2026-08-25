import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { GoalFormDialog } from "./GoalFormDialog";

describe("GoalFormDialog", () => {
  it("renders form fields and handles submit", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <GoalFormDialog open={true} onClose={onClose} onSubmit={onSubmit} mode="create" />,
    );

    expect(screen.getByRole("heading", { name: "Create goal" })).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/Goal title/i);
    await userEvent.type(titleInput, "Read 12 Books");

    const submitBtn = screen.getByRole("button", { name: "Create goal" });
    await userEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Read 12 Books",
        category: "PERSONAL",
        progressType: "PERCENTAGE",
        status: "NOT_STARTED",
      }),
    );

    await expectNoAccessibilityViolations(container);
  });

  it("shows validation error when title is empty", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(<GoalFormDialog open={true} onClose={onClose} onSubmit={onSubmit} mode="create" />);

    const submitBtn = screen.getByRole("button", { name: "Create goal" });
    await userEvent.click(submitBtn);

    expect(screen.getAllByText("Goal title is required.").length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("populates initial values in edit mode", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <GoalFormDialog
        open={true}
        onClose={onClose}
        onSubmit={onSubmit}
        mode="edit"
        initialValues={{
          title: "Run 100km",
          category: "HEALTH",
          progressType: "NUMERIC",
          targetValue: 100,
          currentValue: 20,
          unit: "km",
          status: "IN_PROGRESS",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit goal" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Run 100km")).toBeInTheDocument();
    expect(screen.getByDisplayValue("100")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    expect(screen.getByDisplayValue("km")).toBeInTheDocument();
  });
});
