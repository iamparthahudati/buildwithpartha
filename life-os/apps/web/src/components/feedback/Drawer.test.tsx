import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Drawer } from "./Drawer";

function OpenableDrawer(props: { readonly isDirty?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open trigger
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Prepare weekly review"
        {...(props.isDirty === undefined ? {} : { isDirty: props.isDirty })}
      >
        <p>Task details.</p>
      </Drawer>
    </>
  );
}

describe("Drawer", () => {
  it("renders nothing while closed", () => {
    renderWithUser(
      <Drawer open={false} onClose={() => {}} title="Prepare weekly review">
        <p>Body.</p>
      </Drawer>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is labelled by its title and modal", async () => {
    const { container } = renderWithUser(
      <Drawer open onClose={() => {}} title="Prepare weekly review">
        <p>Task details.</p>
      </Drawer>,
    );

    const drawer = screen.getByRole("dialog", { name: "Prepare weekly review" });
    expect(drawer).toHaveAttribute("aria-modal", "true");
    await expectNoAccessibilityViolations(container);
  });

  it("accepts a context-specific close label", () => {
    renderWithUser(
      <Drawer open onClose={() => {}} title="Prepare weekly review" closeLabel="Close task details">
        <p>Task details.</p>
      </Drawer>,
    );

    expect(screen.getByRole("button", { name: "Close task details" })).toBeInTheDocument();
  });

  it("traps focus and returns it to the trigger on close", async () => {
    const { user } = renderWithUser(<OpenableDrawer />);

    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Open trigger" })).toHaveFocus();
  });

  it("closes on Escape and a backdrop click when not dirty", async () => {
    const onClose = vi.fn();
    const { user, container } = renderWithUser(
      <Drawer open onClose={onClose} title="Prepare weekly review">
        <p>Task details.</p>
      </Drawer>,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = container.querySelector(".lifeos-drawer-backdrop") as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("routes Escape only to the topmost of a nested Drawer and Dialog, like Dialog does alone", async () => {
    const onCloseOuter = vi.fn();
    const onCloseInner = vi.fn();

    function Nested() {
      const [innerOpen, setInnerOpen] = useState(false);
      return (
        <Drawer open onClose={onCloseOuter} title="Prepare weekly review">
          <button type="button" onClick={() => setInnerOpen(true)}>
            Edit details
          </button>
          <Drawer
            open={innerOpen}
            onClose={() => {
              setInnerOpen(false);
              onCloseInner();
            }}
            title="Edit details"
          >
            <p>Nested form.</p>
          </Drawer>
        </Drawer>
      );
    }

    const { user } = renderWithUser(<Nested />);
    await user.click(screen.getByRole("button", { name: "Edit details" }));

    await user.keyboard("{Escape}");

    expect(onCloseInner).toHaveBeenCalledTimes(1);
    expect(onCloseOuter).not.toHaveBeenCalled();
  });

  it("intercepts Escape behind a discard confirmation while dirty", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <Drawer open onClose={onClose} title="Prepare weekly review" isDirty>
        <p>Task details.</p>
      </Drawer>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeInTheDocument();
  });

  it("intercepts the close button behind the same confirmation while dirty", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <Drawer open onClose={onClose} title="Prepare weekly review" isDirty>
        <p>Task details.</p>
      </Drawer>,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeInTheDocument();
  });

  it("only closes for real once the discard is confirmed", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <Drawer open onClose={onClose} title="Prepare weekly review" isDirty>
        <p>Task details.</p>
      </Drawer>,
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns to the drawer, still open and still dirty, if the discard is itself cancelled", async () => {
    const onClose = vi.fn();
    const { user } = renderWithUser(
      <Drawer open onClose={onClose} title="Prepare weekly review" isDirty>
        <p>Task details.</p>
      </Drawer>,
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Prepare weekly review" })).toBeInTheDocument();
  });

  it("locks page scroll while open and releases it once closed", async () => {
    const { user } = renderWithUser(<OpenableDrawer />);

    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(document.body.style.overflow).toBe("");
  });
});
