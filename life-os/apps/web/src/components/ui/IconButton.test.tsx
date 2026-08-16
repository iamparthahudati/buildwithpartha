import { screen } from "@testing-library/react";
import { Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("takes its accessible name from the control, not the icon", async () => {
    const { container } = renderWithUser(<IconButton icon={Trash2} label="Delete task" />);

    expect(screen.getByRole("button", { name: "Delete task" })).toBeVisible();
    // The glyph itself is decorative and contributes nothing to the name.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("keeps the label in the DOM so text survives a stylesheet failure", () => {
    renderWithUser(<IconButton icon={Trash2} label="Delete task" />);

    expect(screen.getByText("Delete task")).toHaveClass("lifeos-visually-hidden");
  });

  it("offers the label as a pointer tooltip without making it the only route", () => {
    renderWithUser(<IconButton icon={Trash2} label="Delete task" />);

    expect(screen.getByRole("button", { name: "Delete task" })).toHaveAttribute(
      "title",
      "Delete task",
    );
  });

  it("can suppress the native title when a real tooltip takes over", () => {
    renderWithUser(<IconButton icon={Trash2} label="Delete task" showTitle={false} />);

    const button = screen.getByRole("button", { name: "Delete task" });
    expect(button).not.toHaveAttribute("title");
    // The name still comes from the control.
    expect(button).toHaveAttribute("aria-label", "Delete task");
  });

  it("inherits Button behavior: activation, disabled and loading", async () => {
    const onClick = vi.fn();
    const { user, rerender } = renderWithUser(
      <IconButton icon={Trash2} label="Delete task" onClick={onClick} />,
    );

    await user.click(screen.getByRole("button", { name: "Delete task" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<IconButton icon={Trash2} label="Delete task" onClick={onClick} loading />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");

    rerender(<IconButton icon={Trash2} label="Delete task" onClick={onClick} disabled />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("defaults to the ghost variant and the medium size", () => {
    renderWithUser(<IconButton icon={Trash2} label="Delete task" />);

    expect(screen.getByRole("button")).toHaveClass(
      "lifeos-icon-button",
      "lifeos-button--ghost",
      "lifeos-button--md",
    );
  });

  it("accepts a danger variant for destructive actions", () => {
    renderWithUser(<IconButton icon={Trash2} label="Delete task" variant="danger" />);

    expect(screen.getByRole("button")).toHaveClass("lifeos-button--danger");
  });
});
