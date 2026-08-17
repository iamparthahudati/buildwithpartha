import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { TextInput } from "@components/ui";

import { FilterBar, type ActiveFilterChip } from "./FilterBar";

function filterFields() {
  return <TextInput label="Search" value="" onChange={() => {}} />;
}

describe("FilterBar", () => {
  it("renders the caller's own filter controls", () => {
    renderWithUser(<FilterBar>{filterFields()}</FilterBar>);
    expect(screen.getAllByLabelText("Search").length).toBeGreaterThanOrEqual(1);
  });

  it("renders no chip row when there are no active filters", () => {
    renderWithUser(<FilterBar>{filterFields()}</FilterBar>);
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it("renders a chip per active filter and removing one calls its own handler", async () => {
    const onRemoveStatus = vi.fn();
    const chips: readonly ActiveFilterChip[] = [
      { id: "status", label: "Status: Open", onRemove: onRemoveStatus },
      { id: "assignee", label: "Assignee: Ada", onRemove: vi.fn() },
    ];
    const { user } = renderWithUser(<FilterBar activeChips={chips}>{filterFields()}</FilterBar>);

    expect(screen.getByText("Status: Open")).toBeInTheDocument();
    expect(screen.getByText("Assignee: Ada")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Status: Open filter" }));
    expect(onRemoveStatus).toHaveBeenCalledTimes(1);
  });

  it("shows Clear all only once there is at least one active filter, and it is caller-supplied", async () => {
    const onClearAll = vi.fn();
    const { user, rerender } = renderWithUser(
      <FilterBar onClearAll={onClearAll}>{filterFields()}</FilterBar>,
    );
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();

    rerender(
      <FilterBar
        onClearAll={onClearAll}
        activeChips={[{ id: "status", label: "Status: Open", onRemove: () => {} }]}
      >
        {filterFields()}
      </FilterBar>,
    );
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("shows no Clear all button when the caller does not supply one, even with active chips", () => {
    renderWithUser(
      <FilterBar activeChips={[{ id: "status", label: "Status: Open", onRemove: () => {} }]}>
        {filterFields()}
      </FilterBar>,
    );
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
  });

  it("renders the caller's own result count text", () => {
    renderWithUser(<FilterBar resultCount="128 tasks">{filterFields()}</FilterBar>);
    expect(screen.getByText("128 tasks")).toBeInTheDocument();
  });

  it("shows the active filter count on the mobile trigger", () => {
    renderWithUser(
      <FilterBar activeChips={[{ id: "status", label: "Status: Open", onRemove: () => {} }]}>
        {filterFields()}
      </FilterBar>,
    );
    const trigger = screen.getByRole("button", { name: /Filters/ });
    expect(trigger).toHaveTextContent("1");
  });

  it("opens a Drawer with the same filter controls from the mobile trigger", async () => {
    const { user } = renderWithUser(<FilterBar>{filterFields()}</FilterBar>);

    await user.click(screen.getByRole("button", { name: /^Filters/ }));

    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(within(dialog).getByLabelText("Search")).toBeInTheDocument();
  });

  it("closes the Drawer on Escape", async () => {
    const { user } = renderWithUser(<FilterBar>{filterFields()}</FilterBar>);

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("has no axe violations with chips, a count and the trigger present", async () => {
    const { container } = renderWithUser(
      <FilterBar
        activeChips={[{ id: "status", label: "Status: Open", onRemove: () => {} }]}
        resultCount="128 tasks"
        onClearAll={() => {}}
      >
        {filterFields()}
      </FilterBar>,
    );
    await expectNoAccessibilityViolations(container);
  });
});
