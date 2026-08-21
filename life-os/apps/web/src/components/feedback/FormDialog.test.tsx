import { useState } from "react";

import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { TextInput } from "@components/ui";

import { FormDialog } from "./FormDialog";

function OpenableFormDialog(props: {
  readonly isDirty?: boolean;
  readonly pending?: boolean;
  readonly submitDisabled?: boolean;
  readonly error?: string;
  readonly onSubmit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open trigger
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={props.onSubmit ?? (() => {})}
        title="Add project"
        description="Projects group related outcomes and Tasks."
        submitLabel="Add project"
        {...(props.isDirty === undefined ? {} : { isDirty: props.isDirty })}
        {...(props.pending === undefined ? {} : { pending: props.pending })}
        {...(props.submitDisabled === undefined ? {} : { submitDisabled: props.submitDisabled })}
        {...(props.error === undefined ? {} : { error: props.error })}
      >
        <TextInput
          label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </FormDialog>
    </>
  );
}

describe("FormDialog", () => {
  it("renders nothing while closed", () => {
    renderWithUser(<OpenableFormDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title, description and the caller's own fields when open", async () => {
    const { user } = renderWithUser(<OpenableFormDialog />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    expect(screen.getByRole("dialog", { name: "Add project" })).toBeInTheDocument();
    expect(screen.getByText("Projects group related outcomes and Tasks.")).toBeInTheDocument();
    expect(screen.getByLabelText("Project name")).toBeInTheDocument();
  });

  it("submitting the form calls onSubmit", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(<OpenableFormDialog onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.click(screen.getByRole("button", { name: "Add project" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows the server error and keeps the dialog open", async () => {
    const { user } = renderWithUser(<OpenableFormDialog error="That name is already taken." />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    expect(screen.getByText("That name is already taken.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the submit button as busy while pending, and disables Cancel", async () => {
    const { user } = renderWithUser(<OpenableFormDialog pending />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    const submit = screen.getByRole("button", { name: "Add project" });
    expect(submit).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("can disable submission without presenting a pending state", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(<OpenableFormDialog submitDisabled onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    const submit = screen.getByRole("button", { name: "Add project" });
    expect(submit).toBeDisabled();
    expect(submit).not.toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes directly on Escape when not dirty", async () => {
    const { user } = renderWithUser(<OpenableFormDialog />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("intercepts Escape behind a discard confirmation while dirty", async () => {
    const { user } = renderWithUser(<OpenableFormDialog isDirty />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeInTheDocument();
    // The form dialog itself is still open underneath.
    expect(screen.getByRole("dialog", { name: "Add project" })).toBeInTheDocument();
  });

  it("confirming the discard closes the form dialog entirely", async () => {
    const { user } = renderWithUser(<OpenableFormDialog isDirty />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancelling the discard returns to the still-open, still-dirty dialog", async () => {
    const { user } = renderWithUser(<OpenableFormDialog isDirty />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    await user.keyboard("{Escape}");

    const discardDialog = screen.getByRole("dialog", { name: "Discard unsaved changes?" });
    await user.click(within(discardDialog).getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("dialog", { name: "Discard unsaved changes?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Add project" })).toBeInTheDocument();
  });

  it("Cancel also routes through the dirty guard", async () => {
    const { user } = renderWithUser(<OpenableFormDialog isDirty />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeInTheDocument();
  });

  it("does not close on Escape while pending, even if dirty", async () => {
    const { user } = renderWithUser(<OpenableFormDialog isDirty pending />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Add project" })).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Discard unsaved changes?" }),
    ).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { user, container } = renderWithUser(<OpenableFormDialog error="Something failed." />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    await expectNoAccessibilityViolations(container);
  });
});
