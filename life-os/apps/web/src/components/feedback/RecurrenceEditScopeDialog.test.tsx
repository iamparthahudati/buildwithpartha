import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RecurrenceEditScopeDialog } from "./RecurrenceEditScopeDialog";

describe("RecurrenceEditScopeDialog", () => {
  it("renders scope options and title when open", () => {
    render(<RecurrenceEditScopeDialog open={true} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByText("Edit Recurring Task")).toBeInTheDocument();
    expect(screen.getByText("This occurrence only")).toBeInTheDocument();
    expect(screen.getByText("This and future occurrences")).toBeInTheDocument();
    expect(screen.getByText("All occurrences in series")).toBeInTheDocument();
  });

  it("submits selected scope on confirm", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(<RecurrenceEditScopeDialog open={true} onClose={vi.fn()} onConfirm={handleConfirm} />);

    const seriesRadio = screen.getByLabelText(/All occurrences in series/i);
    await user.click(seriesRadio);

    const applyButton = screen.getByRole("button", { name: "Apply Edit" });
    await user.click(applyButton);

    expect(handleConfirm).toHaveBeenCalledWith("SERIES");
  });

  it("renders delete variant with danger button label", () => {
    render(
      <RecurrenceEditScopeDialog
        open={true}
        actionType="delete"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Delete Recurring Task")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Task" })).toBeInTheDocument();
  });

  it("handles custom title, description, confirmLabel, cancelLabel, and className", () => {
    render(
      <RecurrenceEditScopeDialog
        open={true}
        title="Custom Modal Title"
        description="Custom Modal Description"
        confirmLabel="Custom Save"
        cancelLabel="Custom Dismiss"
        className="custom-dialog-class"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Custom Modal Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Modal Description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom Dismiss" })).toBeInTheDocument();
  });

  it("renders error state when error prop is provided", () => {
    render(
      <RecurrenceEditScopeDialog
        open={true}
        error="Server edit error"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Server edit error")).toBeInTheDocument();
  });

  it("disables controls and shows pending state when pending is true", () => {
    render(
      <RecurrenceEditScopeDialog
        open={true}
        pending={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const radio = screen.getByLabelText(/This occurrence only/i);
    expect(radio).toBeDisabled();
  });

  it("triggers onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<RecurrenceEditScopeDialog open={true} onClose={handleClose} onConfirm={vi.fn()} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(handleClose).toHaveBeenCalled();
  });

  it("resets selection to THIS_OCCURRENCE when re-opened", () => {
    const { rerender } = render(
      <RecurrenceEditScopeDialog open={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );

    rerender(<RecurrenceEditScopeDialog open={true} onClose={vi.fn()} onConfirm={vi.fn()} />);

    const radio = screen.getByLabelText(/This occurrence only/i);
    expect(radio).toBeChecked();
  });
});
