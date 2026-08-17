import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ConfirmDialog } from "./ConfirmDialog";

function ArchiveConfirm(props: {
  readonly onConfirm?: () => void;
  readonly pending?: boolean;
  readonly error?: string;
  readonly typedConfirmation?: string;
  readonly dismissible?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Archive
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={props.onConfirm ?? (() => {})}
        title='Archive "Website refresh"?'
        description="The Project will leave active views. Its Tasks remain available according to their current status. You can restore the Project from Archived."
        confirmLabel="Archive project"
        {...(props.pending === undefined ? {} : { pending: props.pending })}
        {...(props.error ? { error: props.error } : {})}
        {...(props.typedConfirmation ? { typedConfirmation: props.typedConfirmation } : {})}
        {...(props.dismissible === undefined ? {} : { dismissible: props.dismissible })}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("names the record and the exact consequence, never a generic prompt", async () => {
    const { user, container } = renderWithUser(<ArchiveConfirm />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(
      screen.getByRole("dialog", { name: 'Archive "Website refresh"?' }),
    ).toHaveAccessibleDescription(/leave active views/);
    // The prohibited generic copy the tone guide names explicitly.
    expect(screen.queryByText(/^are you sure\?$/i)).not.toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("repeats the action on its own buttons rather than a generic Yes/OK", async () => {
    const { user } = renderWithUser(<ArchiveConfirm />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(screen.getByRole("button", { name: "Archive project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "OK" })).not.toBeInTheDocument();
  });

  it("defaults focus to Cancel, the safe option, not the danger action", async () => {
    const { user } = renderWithUser(<ArchiveConfirm />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("calls onConfirm when the danger action is clicked", async () => {
    const onConfirm = vi.fn();
    const { user } = renderWithUser(<ArchiveConfirm onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await user.click(screen.getByRole("button", { name: "Archive project" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes on Cancel without ever calling onConfirm", async () => {
    const onConfirm = vi.fn();
    const { user } = renderWithUser(<ArchiveConfirm onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape by default, the same outcome as Cancel", async () => {
    const { user } = renderWithUser(<ArchiveConfirm />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables Escape when a caller asks for the stricter, most-severe behavior", async () => {
    const { user } = renderWithUser(<ArchiveConfirm dismissible={false} />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables both buttons and marks the confirm action busy while pending", async () => {
    const { user, rerender } = renderWithUser(<ArchiveConfirm />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    // A rerender of the same component instance keeps its own `open` state,
    // so the dialog stays open with the new `pending` prop applied to it.
    rerender(<ArchiveConfirm pending />);

    const confirmButton = screen.getByRole("button", { name: /Archive project/ });
    expect(confirmButton).toHaveAttribute("aria-busy", "true");
    // Loading uses aria-disabled, not the native attribute — Button (LOS-0306)
    // keeps a busy button focusable and blocks activation in its own handler
    // rather than dropping it from the tab order mid-interaction.
    expect(confirmButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("shows a caller-supplied error without losing the dialog or the user's place", async () => {
    const { user, container } = renderWithUser(
      <ArchiveConfirm error="Something went wrong. Try again." />,
    );
    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("keeps the danger action disabled until the typed confirmation matches exactly", async () => {
    const onConfirm = vi.fn();
    const { user } = renderWithUser(
      <ArchiveConfirm onConfirm={onConfirm} typedConfirmation="Website refresh" />,
    );
    await user.click(screen.getByRole("button", { name: "Archive" }));

    const confirmButton = screen.getByRole("button", { name: "Archive project" });
    expect(confirmButton).toBeDisabled();

    const field = screen.getByLabelText('Type "Website refresh" to confirm');
    await user.type(field, "Website ref");
    expect(confirmButton).toBeDisabled();

    await user.type(field, "resh");
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("focuses the typed-confirmation field first when one is required", async () => {
    const { user } = renderWithUser(<ArchiveConfirm typedConfirmation="Website refresh" />);
    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(screen.getByLabelText('Type "Website refresh" to confirm')).toHaveFocus();
  });

  it("clears a previously typed confirmation when reopened for a new attempt", async () => {
    const { user } = renderWithUser(<ArchiveConfirm typedConfirmation="Website refresh" />);

    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.type(screen.getByLabelText('Type "Website refresh" to confirm'), "Website refresh");
    expect(screen.getByRole("button", { name: "Archive project" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(screen.getByLabelText('Type "Website refresh" to confirm')).toHaveValue("");
    expect(screen.getByRole("button", { name: "Archive project" })).toBeDisabled();
  });
});
