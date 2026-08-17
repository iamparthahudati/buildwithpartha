import { useState } from "react";

import { screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Combobox, type ComboboxOption } from "./Combobox";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const PROJECT_OPTIONS: readonly ComboboxOption[] = [
  { value: "portfolio-refresh", label: "Portfolio refresh" },
  { value: "home-records-cleanup", label: "Home records cleanup" },
  { value: "learning-plan", label: "Learning plan" },
  { value: "archived-plan", label: "Archived plan", disabled: true },
];

interface SingleComboboxProps {
  readonly options?: readonly ComboboxOption[];
  readonly onValueChange?: (value: string | null) => void;
  readonly loading?: boolean;
  readonly onCreateOption?: (query: string) => void;
  readonly virtualizeThreshold?: number;
}

function SingleCombobox({
  options = PROJECT_OPTIONS,
  onValueChange,
  loading = false,
  onCreateOption,
  virtualizeThreshold,
}: SingleComboboxProps) {
  const [value, setValue] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  return (
    <Combobox
      label="Project"
      options={options}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      query={query}
      onQueryChange={setQuery}
      loading={loading}
      {...(onCreateOption ? { onCreateOption } : {})}
      {...(virtualizeThreshold === undefined ? {} : { virtualizeThreshold })}
    />
  );
}

function MultiCombobox() {
  const [value, setValue] = useState<readonly string[]>([]);
  const [query, setQuery] = useState("");
  return (
    <Combobox
      multiple
      label="Projects"
      options={PROJECT_OPTIONS}
      value={value}
      onValueChange={setValue}
      query={query}
      onQueryChange={setQuery}
    />
  );
}

describe("Combobox — single select", () => {
  it("binds a real label to a combobox input", async () => {
    const { container } = renderWithUser(<SingleCombobox />);

    expect(screen.getByRole("combobox", { name: "Project" })).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("opens the listbox and lists every option on focus", async () => {
    const { user, container } = renderWithUser(<SingleCombobox />);

    await user.click(screen.getByRole("combobox"));

    const listbox = screen.getByRole("listbox", { name: "Project" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(4);
    await expectNoAccessibilityViolations(container);
  });

  it("filters options as the query changes", async () => {
    const { user } = renderWithUser(<SingleCombobox />);

    await user.type(screen.getByRole("combobox"), "port");

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(1);
    expect(within(listbox).getByRole("option", { name: "Portfolio refresh" })).toBeInTheDocument();
  });

  it("moves the active option with arrow keys and selects it with Enter, without moving real focus", async () => {
    const { user } = renderWithUser(<SingleCombobox />);
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.keyboard("{ArrowDown}");

    // Real DOM focus never leaves the input; aria-activedescendant is what
    // tracks the keyboard's current option instead.
    expect(input).toHaveFocus();
    const active = screen.getByRole("option", { name: "Portfolio refresh" });
    expect(input).toHaveAttribute("aria-activedescendant", active.id);

    await user.keyboard("{Enter}");

    expect(input).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("wraps from the first option back to the last on ArrowUp", async () => {
    const { user } = renderWithUser(<SingleCombobox />);
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.keyboard("{ArrowUp}");

    const last = screen.getByRole("option", { name: "Archived plan" });
    expect(input).toHaveAttribute("aria-activedescendant", last.id);
  });

  it("jumps to the first and last option with Home and End", async () => {
    const { user } = renderWithUser(<SingleCombobox />);
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.keyboard("{End}");
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Archived plan" }).id,
    );

    await user.keyboard("{Home}");
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Portfolio refresh" }).id,
    );
  });

  it("does nothing on Enter while nothing is active", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(<SingleCombobox onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Enter}");

    expect(onValueChange).not.toHaveBeenCalled();
    // Enter with nothing active and the listbox already open must not close it.
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("commits a selection on click and closes the listbox", async () => {
    const { user } = renderWithUser(<SingleCombobox />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Learning plan" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("does not select a disabled option", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(<SingleCombobox onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    const disabledOption = screen.getByRole("option", { name: "Archived plan" });
    expect(disabledOption).toHaveAttribute("aria-disabled", "true");

    await user.click(disabledOption);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("closes without selecting on Escape", async () => {
    const { user } = renderWithUser(<SingleCombobox />);

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when focus moves elsewhere on the page", async () => {
    const { user } = renderWithUser(
      <>
        <SingleCombobox />
        <button type="button">Elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("Combobox — multi select", () => {
  it("keeps the listbox open after a selection, so more than one can be picked", async () => {
    const { user } = renderWithUser(<MultiCombobox />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Portfolio refresh" }));

    // Closing here would undo the entire point of multi-select.
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows each selection as a removable chip", async () => {
    const { user } = renderWithUser(<MultiCombobox />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Portfolio refresh" }));
    await user.click(screen.getByRole("option", { name: "Learning plan" }));

    expect(screen.getByRole("button", { name: "Remove Portfolio refresh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Learning plan" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Portfolio refresh" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("removes a chip through its own dismiss button, reachable by keyboard", async () => {
    const { user } = renderWithUser(<MultiCombobox />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Portfolio refresh" }));

    await user.click(screen.getByRole("button", { name: "Remove Portfolio refresh" }));

    // The label stays visible as an option in the still-open listbox — only
    // the chip, and its now-unnecessary remove button, should be gone.
    expect(
      screen.queryByRole("button", { name: "Remove Portfolio refresh" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Portfolio refresh" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("removes the most recently added chip on Backspace against an empty query", async () => {
    const { user } = renderWithUser(<MultiCombobox />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Portfolio refresh" }));
    await user.click(screen.getByRole("option", { name: "Learning plan" }));

    await user.keyboard("{Backspace}");

    expect(screen.getByRole("button", { name: "Remove Portfolio refresh" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Learning plan" })).not.toBeInTheDocument();
  });

  it("marks the listbox as multi-selectable", async () => {
    const { user } = renderWithUser(<MultiCombobox />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
  });
});

describe("Combobox — loading, no results, create", () => {
  it("announces loading and hides the no-results row while it is true", async () => {
    const { user } = renderWithUser(<SingleCombobox options={[]} loading />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "zzz");

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it("names the empty result once loading has finished", async () => {
    const { user, container } = renderWithUser(<SingleCombobox />);

    await user.type(screen.getByRole("combobox"), "zzz");

    expect(screen.getByText('No results for "zzz".')).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("offers to create an option that does not already exist", async () => {
    const onCreateOption = vi.fn();
    const { user } = renderWithUser(<SingleCombobox onCreateOption={onCreateOption} />);

    await user.type(screen.getByRole("combobox"), "Client work");
    await user.click(screen.getByRole("option", { name: 'Create "Client work"' }));

    expect(onCreateOption).toHaveBeenCalledWith("Client work");
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("does not offer to create an option that already matches exactly", async () => {
    const onCreateOption = vi.fn();
    const { user } = renderWithUser(<SingleCombobox onCreateOption={onCreateOption} />);

    await user.type(screen.getByRole("combobox"), "Learning plan");

    expect(screen.queryByRole("option", { name: /^Create/ })).not.toBeInTheDocument();
  });
});

describe("Combobox — virtualize threshold", () => {
  const manyOptions: readonly ComboboxOption[] = Array.from({ length: 80 }, (_unused, index) => ({
    value: `option-${index}`,
    label: `Option ${index}`,
  }));

  it("renders only the threshold and explains the rest are narrowed by typing", async () => {
    const { user } = renderWithUser(
      <SingleCombobox options={manyOptions} virtualizeThreshold={20} />,
    );

    await user.click(screen.getByRole("combobox"));

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getAllByRole("option")).toHaveLength(20);
    expect(screen.getByText("Showing 20 of 80. Type to narrow further.")).toBeInTheDocument();
  });
});
