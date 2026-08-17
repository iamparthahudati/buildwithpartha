import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ViewToggle } from "./ViewToggle";

describe("ViewToggle", () => {
  it("renders a labelled group of three view buttons by default", () => {
    renderWithUser(<ViewToggle value="list" onChange={() => {}} />);
    const group = screen.getByRole("group", { name: "View" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grid view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table view" })).toBeInTheDocument();
  });

  it("marks only the selected view as pressed", () => {
    renderWithUser(<ViewToggle value="grid" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Table view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange with the clicked mode", async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(<ViewToggle value="list" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Table view" }));
    expect(onChange).toHaveBeenCalledWith("table");
  });

  it("restricts which modes are offered via modes", () => {
    renderWithUser(<ViewToggle value="list" onChange={() => {}} modes={["list", "grid"]} />);
    expect(screen.getByRole("button", { name: "List view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grid view" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Table view" })).not.toBeInTheDocument();
  });

  it("accepts a caller-supplied group label", () => {
    renderWithUser(<ViewToggle value="list" onChange={() => {}} label="Task list view" />);
    expect(screen.getByRole("group", { name: "Task list view" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(<ViewToggle value="grid" onChange={() => {}} />);
    await expectNoAccessibilityViolations(container);
  });
});
