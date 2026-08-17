import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { SortControl, type SortOption } from "./SortControl";

const OPTIONS: readonly SortOption[] = [
  { id: "name", label: "Name" },
  { id: "created", label: "Date created" },
  { id: "due", label: "Due date" },
];

describe("SortControl", () => {
  it("shows the current field on the trigger", () => {
    renderWithUser(
      <SortControl
        options={OPTIONS}
        value={{ optionId: "name", direction: "asc" }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Sort: Name/ })).toBeInTheDocument();
  });

  it("announces the direction as a word, not only an icon", () => {
    renderWithUser(
      <SortControl
        options={OPTIONS}
        value={{ optionId: "name", direction: "desc" }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Sort: Name, descending" })).toBeInTheDocument();
  });

  it("toggles direction when the already-selected field is picked again", async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <SortControl
        options={OPTIONS}
        value={{ optionId: "name", direction: "asc" }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Sort: Name/ }));
    await user.click(screen.getByRole("menuitem", { name: "Name" }));

    expect(onChange).toHaveBeenCalledWith({ optionId: "name", direction: "desc" });
  });

  it("keeps the current direction when a different field is picked", async () => {
    const onChange = vi.fn();
    const { user } = renderWithUser(
      <SortControl
        options={OPTIONS}
        value={{ optionId: "name", direction: "desc" }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Sort: Name/ }));
    await user.click(screen.getByRole("menuitem", { name: "Due date" }));

    expect(onChange).toHaveBeenCalledWith({ optionId: "due", direction: "desc" });
  });

  it("lists every option in the menu", async () => {
    const { user } = renderWithUser(
      <SortControl
        options={OPTIONS}
        value={{ optionId: "name", direction: "asc" }}
        onChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Sort: Name/ }));
    expect(screen.getByRole("menuitem", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Date created" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Due date" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(
      <SortControl
        options={OPTIONS}
        value={{ optionId: "name", direction: "asc" }}
        onChange={() => {}}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
