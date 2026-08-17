import { useState } from "react";

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { CommandPalette, type CommandPaletteGroup } from "./CommandPalette";
import { useCommandPaletteShortcut } from "./useCommandPaletteShortcut";

const GROUPS: readonly CommandPaletteGroup[] = [
  {
    id: "projects",
    heading: "Projects",
    items: [
      { id: "project-kitchen", label: "Kitchen remodel", onSelect: vi.fn() },
      { id: "project-archived", label: "Archived plan", onSelect: vi.fn(), disabled: true },
    ],
  },
  {
    id: "actions",
    heading: "Actions",
    items: [{ id: "action-new-task", label: "New task", shortcut: "⌘N", onSelect: vi.fn() }],
  },
];

interface OpenablePaletteProps {
  readonly groups?: readonly CommandPaletteGroup[];
  readonly loading?: boolean;
  readonly onSearch?: (query: string) => void;
}

function OpenablePalette({ groups = GROUPS, loading = false, onSearch }: OpenablePaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open trigger
      </button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        query={query}
        onQueryChange={setQuery}
        onSearch={onSearch ?? (() => {})}
        groups={groups}
        loading={loading}
        debounceMs={0}
      />
    </>
  );
}

describe("CommandPalette", () => {
  it("renders nothing while closed", () => {
    renderWithUser(<OpenablePalette />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders grouped results with an accessible search input when open", async () => {
    const { user } = renderWithUser(<OpenablePalette />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    expect(screen.getByRole("combobox", { name: "Command palette" })).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Kitchen remodel" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /New task/ })).toBeInTheDocument();
  });

  it("focuses the search input on open, not the dialog's own close button", async () => {
    const { user } = renderWithUser(<OpenablePalette />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("ArrowDown moves the active descendant to the first result, spanning groups", async () => {
    const { user } = renderWithUser(<OpenablePalette />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    const input = screen.getByRole("combobox");
    await user.type(input, "{ArrowDown}");
    expect(screen.getByRole("option", { name: "Kitchen remodel" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Skips the disabled item entirely, landing on the next group's item.
    await user.type(input, "{ArrowDown}");
    expect(screen.getByRole("option", { name: /New task/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ArrowUp from the top wraps to the last navigable result", async () => {
    const { user } = renderWithUser(<OpenablePalette />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.type(screen.getByRole("combobox"), "{ArrowUp}");
    expect(screen.getByRole("option", { name: /New task/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Home and End jump to the first and last navigable results", async () => {
    const { user } = renderWithUser(<OpenablePalette />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    const input = screen.getByRole("combobox");
    await user.type(input, "{End}");
    expect(screen.getByRole("option", { name: /New task/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.type(input, "{Home}");
    expect(screen.getByRole("option", { name: "Kitchen remodel" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Enter with nothing highlighted falls through to an immediate search submit", async () => {
    const onSearch = vi.fn();
    const { user } = renderWithUser(<OpenablePalette groups={[]} onSearch={onSearch} />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.type(screen.getByRole("combobox"), "kitchen{Enter}");
    expect(onSearch).toHaveBeenCalledWith("kitchen");
    // Enter alone must not have activated anything or closed the dialog.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Enter activates the active result and closes the palette", async () => {
    const onSelect = vi.fn();
    const groups: readonly CommandPaletteGroup[] = [
      { id: "actions", heading: "Actions", items: [{ id: "a", label: "New task", onSelect }] },
    ];
    const { user } = renderWithUser(<OpenablePalette groups={groups} />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.type(screen.getByRole("combobox"), "{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking a result activates it and closes the palette", async () => {
    const onSelect = vi.fn();
    const groups: readonly CommandPaletteGroup[] = [
      { id: "actions", heading: "Actions", items: [{ id: "a", label: "New task", onSelect }] },
    ];
    const { user } = renderWithUser(<OpenablePalette groups={groups} />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.click(screen.getByRole("option", { name: "New task" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking a disabled result does not activate it", async () => {
    const { user } = renderWithUser(<OpenablePalette />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.click(screen.getByRole("option", { name: "Archived plan" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape, same as any other Dialog", async () => {
    const { user } = renderWithUser(<OpenablePalette />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a loading status row while loading", async () => {
    const { user } = renderWithUser(<OpenablePalette loading />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    // Appears twice: the Spinner's own visually-hidden label, and the
    // status row inside the listbox — the same pattern Combobox uses.
    expect(screen.getAllByText("Searching…").length).toBeGreaterThan(0);
  });

  it("shows a no-results message once a query narrows every group to empty", async () => {
    const { user } = renderWithUser(<OpenablePalette groups={[]} />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    await user.type(screen.getByRole("combobox"), "nothing matches this");

    expect(screen.getByText('No results for "nothing matches this".')).toBeInTheDocument();
  });

  it("reopening after closing starts with nothing highlighted, not wherever the last session left off", async () => {
    const threeItemGroups: readonly CommandPaletteGroup[] = [
      {
        id: "projects",
        heading: "Projects",
        items: [
          { id: "a", label: "Kitchen remodel", onSelect: vi.fn() },
          { id: "b", label: "Home records cleanup", onSelect: vi.fn() },
          { id: "c", label: "Learning plan", onSelect: vi.fn() },
        ],
      },
    ];
    const { user } = renderWithUser(<OpenablePalette groups={threeItemGroups} />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.type(screen.getByRole("combobox"), "{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("option", { name: "Home records cleanup" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    // A fresh ArrowUp wraps to the *last* navigable result ("Learning
    // plan"). Landing back on "Home records cleanup" instead would mean
    // the previous session's highlight survived the close.
    await user.type(screen.getByRole("combobox"), "{ArrowUp}");
    expect(screen.getByRole("option", { name: "Learning plan" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("does not highlight a stale result once groups no longer contain it (no unauthorized cached result)", async () => {
    const narrowedGroups: readonly CommandPaletteGroup[] = [
      {
        id: "actions",
        heading: "Actions",
        items: [{ id: "action-new-task", label: "New task", onSelect: vi.fn() }],
      },
    ];

    function Harness() {
      const [open, setOpen] = useState(false);
      const [query, setQuery] = useState("");
      const [groups, setGroups] = useState<readonly CommandPaletteGroup[]>(GROUPS);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open trigger
          </button>
          <button type="button" onClick={() => setGroups(narrowedGroups)}>
            Narrow results
          </button>
          <CommandPalette
            open={open}
            onClose={() => setOpen(false)}
            query={query}
            onQueryChange={setQuery}
            onSearch={() => {}}
            groups={groups}
            debounceMs={0}
          />
        </>
      );
    }

    const { user } = renderWithUser(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    // Highlights "Kitchen remodel", the first navigable result.
    await user.type(screen.getByRole("combobox"), "{ArrowDown}");
    expect(screen.getByRole("option", { name: "Kitchen remodel" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // The caller replaces `groups` with a set that no longer contains it —
    // simulating a fresh, differently-scoped result set arriving mid-session.
    await user.click(screen.getByRole("button", { name: "Narrow results" }));

    expect(screen.queryByText("Kitchen remodel")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "New task" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls onSearch after typing settles", async () => {
    const onSearch = vi.fn();
    const { user } = renderWithUser(<OpenablePalette onSearch={onSearch} />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));

    await user.type(screen.getByRole("combobox"), "kit");
    expect(onSearch).toHaveBeenCalledWith("kit");
  });

  it("has no axe violations", async () => {
    const { user, container } = renderWithUser(<OpenablePalette loading />);
    await user.click(screen.getByRole("button", { name: "Open trigger" }));
    await expectNoAccessibilityViolations(container);
  });
});

describe("useCommandPaletteShortcut", () => {
  function ShortcutHarness() {
    const [opened, setOpened] = useState(0);
    useCommandPaletteShortcut(() => setOpened((count) => count + 1));
    return <output>{opened}</output>;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("opens on Cmd/Ctrl+K regardless of what currently has focus", async () => {
    const { user } = renderWithUser(<ShortcutHarness />);

    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getByRole("status")).toHaveTextContent("1");
  });

  it("does not open on a bare, unmodified k", async () => {
    const { user } = renderWithUser(<ShortcutHarness />);

    await user.keyboard("k");
    expect(screen.getByRole("status")).toHaveTextContent("0");
  });

  it("does not fire twice from a held key's repeat events", () => {
    renderWithUser(<ShortcutHarness />);

    const repeatEvent = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, repeat: true });
    document.dispatchEvent(repeatEvent);

    expect(screen.getByRole("status")).toHaveTextContent("0");
  });
});
