import { useState } from "react";

import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { SearchField } from "./SearchField";

function ControlledSearchField(props: Partial<React.ComponentProps<typeof SearchField>>) {
  const [value, setValue] = useState(props.value ?? "");
  return (
    <SearchField
      label="Search tasks"
      value={value}
      onValueChange={setValue}
      onSearch={vi.fn()}
      {...props}
    />
  );
}

describe("SearchField", () => {
  it("binds a real, hidden-by-default label", async () => {
    const { container } = renderWithUser(
      <SearchField label="Search tasks" value="" onValueChange={vi.fn()} onSearch={vi.fn()} />,
    );

    expect(screen.getByLabelText("Search tasks")).toBeInTheDocument();
    expect(screen.getByText("Search tasks")).toHaveClass("lifeos-visually-hidden");
    await expectNoAccessibilityViolations(container);
  });

  it("keeps the label visible when asked", () => {
    renderWithUser(
      <SearchField
        label="Search tasks"
        labelHidden={false}
        value=""
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
      />,
    );

    expect(screen.getByText("Search tasks")).not.toHaveClass("lifeos-visually-hidden");
  });

  it("reports every keystroke to the caller, who owns the value", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(
      <SearchField
        label="Search tasks"
        value=""
        onValueChange={onValueChange}
        onSearch={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Search tasks"), "t");

    expect(onValueChange).toHaveBeenCalledWith("t");
  });

  it("clears through the field's own clear action", async () => {
    const onValueChange = vi.fn();
    const { user } = renderWithUser(
      <SearchField
        label="Search tasks"
        value="task"
        onValueChange={onValueChange}
        onSearch={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onValueChange).toHaveBeenCalledWith("");
  });
});

describe("SearchField debounce and submit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("searches automatically after a pause by default", () => {
    const onSearch = vi.fn();
    renderWithUser(
      <SearchField
        label="Search tasks"
        value="task"
        onValueChange={vi.fn()}
        onSearch={onSearch}
        debounceMs={300}
      />,
    );

    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledWith("task");
  });

  it("never searches on its own in submit mode", () => {
    const onSearch = vi.fn();
    renderWithUser(
      <SearchField
        label="Search tasks"
        value="task"
        onValueChange={vi.fn()}
        onSearch={onSearch}
        mode="submit"
      />,
    );

    vi.advanceTimersByTime(10_000);
    expect(onSearch).not.toHaveBeenCalled();
  });
});

describe("SearchField shortcut key", () => {
  it("focuses the field from anywhere on the page", async () => {
    const { user } = renderWithUser(
      <>
        <SearchField
          label="Search tasks"
          value=""
          onValueChange={vi.fn()}
          onSearch={vi.fn()}
          shortcutKey="/"
        />
        <button type="button">Elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    await user.keyboard("/");

    expect(screen.getByLabelText("Search tasks")).toHaveFocus();
  });

  it("does not steal focus while another field is being typed into", async () => {
    const { user } = renderWithUser(
      <>
        <SearchField
          label="Search tasks"
          value=""
          onValueChange={vi.fn()}
          onSearch={vi.fn()}
          shortcutKey="/"
        />
        <label htmlFor="other-field">Task title</label>
        <input id="other-field" />
      </>,
    );

    const otherField = screen.getByLabelText("Task title");
    await user.click(otherField);
    await user.keyboard("/");

    expect(otherField).toHaveFocus();
    expect(screen.getByLabelText("Search tasks")).not.toHaveFocus();
  });

  it("shows the shortcut hint, hidden from assistive technology", () => {
    renderWithUser(
      <SearchField
        label="Search tasks"
        value=""
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        shortcutKey="/"
      />,
    );

    // Tab already reaches every field for every keyboard user; the badge is a
    // bonus hint, not the only way in, so it stays out of the accessible tree.
    const hint = screen.getByText("/");
    expect(hint.closest("[aria-hidden]")).not.toBeNull();
  });
});

describe("SearchField loading", () => {
  it("announces the loading state through a live region", () => {
    renderWithUser(
      <SearchField
        label="Search tasks"
        value="task"
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        loading
        loadingLabel="Searching tasks…"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Searching tasks…");
  });

  it("says nothing while idle", () => {
    renderWithUser(
      <SearchField label="Search tasks" value="" onValueChange={vi.fn()} onSearch={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("SearchField recent searches and no results", () => {
  it("offers recent searches only while focused with an empty value", async () => {
    const { user } = renderWithUser(
      <ControlledSearchField
        recentSearches={["Prepare weekly review", "Compare hosting options"]}
      />,
    );

    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Search tasks"));
    expect(screen.getByText("Recent searches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare weekly review" })).toBeInTheDocument();
  });

  it("hides recent searches once there is a value to search for", async () => {
    const { user } = renderWithUser(
      <ControlledSearchField recentSearches={["Prepare weekly review"]} />,
    );

    await user.click(screen.getByLabelText("Search tasks"));
    await user.type(screen.getByLabelText("Search tasks"), "t");

    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
  });

  it("selecting a recent search sets the value and searches it immediately", async () => {
    const onSearch = vi.fn();
    const { user } = renderWithUser(
      <ControlledSearchField recentSearches={["Prepare weekly review"]} onSearch={onSearch} />,
    );

    await user.click(screen.getByLabelText("Search tasks"));
    await user.click(screen.getByRole("button", { name: "Prepare weekly review" }));

    expect(screen.getByLabelText("Search tasks")).toHaveValue("Prepare weekly review");
    expect(onSearch).toHaveBeenCalledWith("Prepare weekly review");
    expect(screen.getByLabelText("Search tasks")).toHaveFocus();
  });

  it("names the empty result without hiding the field's own value", async () => {
    const { container } = renderWithUser(
      <SearchField
        label="Search tasks"
        value="zzz"
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        resultCount={0}
      />,
    );

    expect(screen.getByText('No results for "zzz".')).toBeInTheDocument();
    await expectNoAccessibilityViolations(container);
  });

  it("says nothing about results until a count is actually known", () => {
    renderWithUser(
      <SearchField label="Search tasks" value="zzz" onValueChange={vi.fn()} onSearch={vi.fn()} />,
    );

    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it("does not show a stale no-results message while a new search is loading", () => {
    renderWithUser(
      <SearchField
        label="Search tasks"
        value="zzz"
        onValueChange={vi.fn()}
        onSearch={vi.fn()}
        resultCount={0}
        loading
      />,
    );

    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });
});
