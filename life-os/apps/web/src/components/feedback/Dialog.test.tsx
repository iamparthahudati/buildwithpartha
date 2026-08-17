import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Dialog } from "./Dialog";

function OpenableDialog(props: {
  readonly title?: string;
  readonly description?: string;
  readonly dismissible?: boolean;
  readonly startOpen?: boolean;
}) {
  const [open, setOpen] = useState(props.startOpen ?? false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open trigger
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={props.title ?? "Archive project"}
        {...(props.description ? { description: props.description } : {})}
        {...(props.dismissible === undefined ? {} : { dismissible: props.dismissible })}
      >
        <p>Its Tasks remain available according to their current status.</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    renderWithUser(
      <Dialog open={false} onClose={() => {}} title="Archive project">
        <p>Body.</p>
      </Dialog>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is labelled by its title and, when given one, described by its description", async () => {
    const { container } = renderWithUser(
      <Dialog
        open
        onClose={() => {}}
        title="Archive project"
        description="This will remove it from active views."
      >
        <p>Body content.</p>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Archive project" });
    expect(dialog).toHaveAccessibleDescription("This will remove it from active views.");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await expectNoAccessibilityViolations(container);
  });

  it("moves focus into itself on open and back to the trigger on close", async () => {
    const { user } = renderWithUser(<OpenableDialog />);

    // Opening via a real click is what gives the trap something meaningful
    // to return focus to — a dialog that starts open with nothing ever
    // deliberately focused first has no trigger to send focus back to.
    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByRole("button", { name: "Open trigger" })).toHaveFocus();
  });

  it("closes on Escape when dismissible", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <Dialog open onClose={onClose} title="Archive project">
        <p>Body.</p>
      </Dialog>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape when not dismissible", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <Dialog open onClose={onClose} title="Delete Note permanently?" dismissible={false}>
        <p>This can't be undone.</p>
      </Dialog>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("still closes a non-dismissible dialog through its own close button", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <Dialog open onClose={onClose} title="Delete Note permanently?" dismissible={false}>
        <p>This can't be undone.</p>
      </Dialog>,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a click of the backdrop but not of its own content", async () => {
    const onClose = vi.fn();
    const { user, container } = renderWithUser(
      <Dialog open onClose={onClose} title="Archive project">
        <p>Body content.</p>
      </Dialog>,
    );

    await user.click(screen.getByText("Body content."));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = container.querySelector(".lifeos-dialog-backdrop") as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on a backdrop click when not dismissible", async () => {
    const onClose = vi.fn();
    const { user, container } = renderWithUser(
      <Dialog open onClose={onClose} title="Delete Note permanently?" dismissible={false}>
        <p>This can't be undone.</p>
      </Dialog>,
    );

    const backdrop = container.querySelector(".lifeos-dialog-backdrop") as HTMLElement;
    await user.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks page scroll while open and restores it once closed", async () => {
    const { user } = renderWithUser(<OpenableDialog startOpen />);

    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(document.body.style.overflow).toBe("");
  });

  it("hides the visible title while keeping it as the accessible name", async () => {
    const { container } = renderWithUser(
      <Dialog open onClose={() => {}} title="Quick add" titleHidden>
        <p>Body.</p>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Quick add" })).toBeInTheDocument();
    expect(screen.getByText("Quick add").parentElement).toHaveClass("lifeos-visually-hidden");
    await expectNoAccessibilityViolations(container);
  });

  // The concrete version of "nested-action protection": two dialogs mounted
  // at once, each with its own Escape listener. Without the shared stack,
  // one Escape press would fire both and close them together.
  // A confirmation opened from a button *inside* an already-open dialog is
  // how nesting actually happens — the inner dialog mounts on a later,
  // separate render, never simultaneously with the outer one.
  function NestedHarness({ onCloseOuter = () => {} }: { readonly onCloseOuter?: () => void }) {
    const [outerOpen, setOuterOpen] = useState(true);
    const [innerOpen, setInnerOpen] = useState(false);

    if (!outerOpen) {
      return null;
    }

    return (
      <Dialog
        open={outerOpen}
        onClose={() => {
          setOuterOpen(false);
          onCloseOuter();
        }}
        title="Delete project?"
      >
        <p>This will also delete its Tasks.</p>
        <button type="button" onClick={() => setInnerOpen(true)}>
          Delete
        </button>
        <Dialog open={innerOpen} onClose={() => setInnerOpen(false)} title="Are you sure?">
          <p>Type the project name to confirm.</p>
        </Dialog>
      </Dialog>
    );
  }

  it("routes Escape only to the topmost of two nested dialogs", async () => {
    const onCloseOuter = vi.fn();
    const { user } = renderWithUser(<NestedHarness onCloseOuter={onCloseOuter} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog", { name: "Are you sure?" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Are you sure?" })).not.toBeInTheDocument();
    expect(onCloseOuter).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Delete project?" })).toBeInTheDocument();
  });

  it("responds to the outer dialog's Escape once the inner one is gone", async () => {
    const { user } = renderWithUser(<NestedHarness />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Are you sure?" })).not.toBeInTheDocument();

    // The inner dialog is gone; the outer one is now genuinely topmost.
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Delete project?" })).not.toBeInTheDocument();
  });

  it("keeps the page locked while any dialog in a nested pair is still open", async () => {
    const { user } = renderWithUser(<NestedHarness />);
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.keyboard("{Escape}");

    // The outer dialog is still open, so the page must stay locked.
    expect(document.body.style.overflow).toBe("hidden");
  });
});
