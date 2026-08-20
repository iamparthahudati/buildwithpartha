import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { SprintFormDialog } from "./SprintFormDialog";

describe("SprintFormDialog", () => {
  it("renders create form dialog and submits valid data", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <SprintFormDialog open={true} onClose={onClose} onSubmit={onSubmit} mode="create" />,
    );

    expect(screen.getByRole("heading", { name: "Create Sprint" })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Sprint Name/);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Sprint 15");

    const startDateInput = screen.getByLabelText(/Start Date/);
    await userEvent.clear(startDateInput);
    await userEvent.type(startDateInput, "2026-08-25");

    const endDateInput = screen.getByLabelText(/End Date/);
    await userEvent.clear(endDateInput);
    await userEvent.type(endDateInput, "2026-09-08");

    const submitBtn = screen.getByRole("button", { name: "Create Sprint" });
    await userEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Sprint 15",
      goal: undefined,
      startDate: "2026-08-25",
      endDate: "2026-09-08",
      targetCapacityPoints: 20,
    });

    await expectNoAccessibilityViolations(container);
  });

  it("validates required fields and date sanity", async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<SprintFormDialog open={true} onClose={onClose} onSubmit={onSubmit} mode="create" />);

    const startDateInput = screen.getByLabelText(/Start Date/);
    await userEvent.clear(startDateInput);
    await userEvent.type(startDateInput, "2026-08-25");

    const endDateInput = screen.getByLabelText(/End Date/);
    await userEvent.clear(endDateInput);
    await userEvent.type(endDateInput, "2026-08-20");

    const submitBtn = screen.getByRole("button", { name: "Create Sprint" });
    await userEvent.click(submitBtn);

    expect(screen.getByText("Sprint name is required.")).toBeInTheDocument();
    expect(screen.getByText("End date must be on or after start date.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
