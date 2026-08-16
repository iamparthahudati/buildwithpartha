import { createRef } from "react";

import { screen } from "@testing-library/react";
import { ChevronDown, Plus } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Button } from "./Button";
import { BUTTON_SIZES, BUTTON_VARIANTS } from "./scales";

describe("Button", () => {
  it("renders an accessible native button", async () => {
    const { container } = renderWithUser(<Button variant="primary">Save changes</Button>);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeVisible();
    await expectNoAccessibilityViolations(container);
  });

  it("defaults to type=button so it cannot submit a form by accident", () => {
    renderWithUser(<Button>Cancel</Button>);

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("type", "button");
  });

  it("submits only when asked to", () => {
    renderWithUser(<Button type="submit">Create project</Button>);

    expect(screen.getByRole("button", { name: "Create project" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("calls its handler when activated by pointer and by keyboard", async () => {
    const onClick = vi.fn();
    const { user } = renderWithUser(<Button onClick={onClick}>Add task</Button>);

    // Keyboard first, from a clean focus state.
    await user.tab();
    expect(screen.getByRole("button", { name: "Add task" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("renders every documented variant and size", () => {
    for (const variant of BUTTON_VARIANTS) {
      for (const size of BUTTON_SIZES) {
        const { unmount } = renderWithUser(
          <Button variant={variant} size={size}>
            Label
          </Button>,
        );

        expect(screen.getByRole("button", { name: "Label" })).toHaveClass(
          `lifeos-button--${variant}`,
          `lifeos-button--${size}`,
        );
        unmount();
      }
    }
  });

  it("keeps icons out of the accessible name", () => {
    renderWithUser(
      <Button iconStart={Plus} iconEnd={ChevronDown}>
        New project
      </Button>,
    );

    // Icons are decorative; the label alone names the control.
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
  });

  it("does not activate while disabled", async () => {
    const onClick = vi.fn();
    const { user } = renderWithUser(
      <Button disabled onClick={onClick}>
        Delete
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  describe("while loading", () => {
    it("announces the busy state and keeps its accessible name", () => {
      renderWithUser(
        <Button loading loadingLabel="Saving">
          Save changes
        </Button>,
      );

      const button = screen.getByRole("button", { name: /Saving/ });
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    it("prevents a duplicate submit", async () => {
      const onClick = vi.fn();
      const { user } = renderWithUser(
        <Button loading onClick={onClick}>
          Save changes
        </Button>,
      );

      await user.click(screen.getByRole("button"));

      expect(onClick).not.toHaveBeenCalled();
    });

    it("stays focusable so the user is not dropped out of the tab order", async () => {
      const { user } = renderWithUser(<Button loading>Save changes</Button>);

      await user.tab();

      // aria-disabled, not the disabled attribute — a disabled button loses focus.
      expect(screen.getByRole("button")).toHaveFocus();
      expect(screen.getByRole("button")).not.toBeDisabled();
    });

    it("keeps the label in the DOM so the button preserves its width", () => {
      renderWithUser(<Button loading>Save changes</Button>);

      expect(screen.getByText("Save changes")).toBeInTheDocument();
    });
  });

  it("forwards a ref to the underlying button", () => {
    const ref = createRef<HTMLButtonElement>();
    renderWithUser(<Button ref={ref}>Focus me</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("stretches when full width is requested", () => {
    renderWithUser(<Button fullWidth>Continue</Button>);

    expect(screen.getByRole("button")).toHaveClass("lifeos-button--full");
  });
});
