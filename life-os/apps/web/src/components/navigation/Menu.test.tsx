import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Menu, type MenuItemDescriptor } from "./Menu";

function itemsFixture(): {
  readonly items: readonly MenuItemDescriptor[];
  readonly onRename: ReturnType<typeof vi.fn>;
  readonly onDuplicate: ReturnType<typeof vi.fn>;
  readonly onArchive: ReturnType<typeof vi.fn>;
  readonly onDelete: ReturnType<typeof vi.fn>;
} {
  const onRename = vi.fn();
  const onDuplicate = vi.fn();
  const onArchive = vi.fn();
  const onDelete = vi.fn();

  const items: readonly MenuItemDescriptor[] = [
    { type: "item", id: "rename", label: "Rename", onSelect: onRename },
    { type: "item", id: "duplicate", label: "Duplicate", onSelect: onDuplicate, disabled: true },
    { type: "separator", id: "sep" },
    { type: "item", id: "archive", label: "Archive", onSelect: onArchive },
    { type: "item", id: "delete", label: "Delete", onSelect: onDelete, destructive: true },
  ];

  return { items, onRename, onDuplicate, onArchive, onDelete };
}

function renderMenu(items: readonly MenuItemDescriptor[]) {
  return renderWithUser(
    <Menu
      trigger={<button type="button">Project actions</button>}
      items={items}
      label="Project actions"
    />,
  );
}

describe("Menu", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders no menu until the trigger is activated", () => {
    const { items } = itemsFixture();
    renderMenu(items);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project actions" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens on click, moves focus to the first enabled item and skips the disabled one", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));

    expect(screen.getByRole("button", { name: "Project actions" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
  });

  it("clicking the trigger again while open closes the menu", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);
    const trigger = screen.getByRole("button", { name: "Project actions" });

    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("ArrowDown on the closed trigger opens the menu focused on the first item", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);

    screen.getByRole("button", { name: "Project actions" }).focus();
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
  });

  it("ArrowUp on the closed trigger opens the menu focused on the last enabled item", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);

    screen.getByRole("button", { name: "Project actions" }).focus();
    await user.keyboard("{ArrowUp}");

    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("moves through items with the arrow keys, skipping the disabled one and wrapping", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();

    // Wraps past the end, back to the first enabled item — Duplicate stays skipped.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("Home and End jump to the first and last enabled items", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus();
  });

  it("typeahead jumps to the next item starting with the typed letter", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.keyboard("a");
    expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveFocus();
  });

  it("repeating the same letter cycles through its matches, like a native select", async () => {
    const onSelect = vi.fn();
    const items: readonly MenuItemDescriptor[] = [
      { type: "item", id: "archive", label: "Archive", onSelect },
      { type: "item", id: "assign", label: "Assign", onSelect },
      { type: "item", id: "add", label: "Add to project", onSelect },
    ];
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveFocus();

    await user.keyboard("a");
    expect(screen.getByRole("menuitem", { name: "Assign" })).toHaveFocus();

    await user.keyboard("a");
    expect(screen.getByRole("menuitem", { name: "Add to project" })).toHaveFocus();

    // The third "a" completes the cycle back to where it started.
    await user.keyboard("a");
    expect(screen.getByRole("menuitem", { name: "Archive" })).toHaveFocus();
  });

  it("Enter activates the focused item, closes the menu and returns focus to the trigger", async () => {
    const { items, onArchive } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project actions" })).toHaveFocus();
  });

  it("a mouse click on an item activates it", async () => {
    const { items, onDelete } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not activate a disabled item", async () => {
    const { items, onDuplicate } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toBeDisabled();
    expect(onDuplicate).not.toHaveBeenCalled();
  });

  it("renders a destructive item in its own class, distinct from the others", () => {
    const { items } = itemsFixture();
    renderMenu(items);
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));

    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveClass(
      "lifeos-menu__item--destructive",
    );
    expect(screen.getByRole("menuitem", { name: "Archive" })).not.toHaveClass(
      "lifeos-menu__item--destructive",
    );
  });

  it("renders the separator with a separator role between the two groups", () => {
    const { items } = itemsFixture();
    renderMenu(items);
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));

    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("Escape closes the menu and returns focus to the trigger", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project actions" })).toHaveFocus();
  });

  it("Tab closes the menu without forcing focus back to the trigger", async () => {
    const { items } = itemsFixture();
    const { user } = renderMenu(items);

    await user.click(screen.getByRole("button", { name: "Project actions" }));
    await user.keyboard("{Tab}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("a pointerdown outside the menu closes it — the touch-safe path, not a blur listener", () => {
    const { items } = itemsFixture();
    renderMenu(items);

    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Real touch taps on iOS Safari do not always blur the previous focus,
    // which is exactly why dismissal listens for pointerdown on the document
    // rather than a blur event on the trigger or the popup.
    fireEvent.pointerDown(document.body, { pointerType: "touch" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("a pointerdown inside the menu does not close it", () => {
    const { items } = itemsFixture();
    renderMenu(items);

    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.pointerDown(screen.getByRole("menu"));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("renders caller-supplied header content above the items", () => {
    const { items } = itemsFixture();
    renderWithUser(
      <Menu
        trigger={<button type="button">Account</button>}
        items={items}
        label="Account menu"
        header={<span>Signed in as Ada</span>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByText("Signed in as Ada")).toBeInTheDocument();
  });

  it("flips the popup above and to the end of the trigger when there is no room the other way", () => {
    const { items } = itemsFixture();
    renderMenu(items);

    vi.spyOn(window, "innerWidth", "get").mockReturnValue(300);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 180,
      left: 260,
      width: 40,
      height: 20,
      bottom: 200,
      right: 300,
      x: 260,
      y: 180,
      toJSON: () => ({}),
    });

    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));

    const popup = screen.getByRole("menu");
    expect(popup).toHaveClass("lifeos-menu__popup--top");
    expect(popup).toHaveClass("lifeos-menu__popup--end");
  });

  it("has no axe violations while open", async () => {
    const { items } = itemsFixture();
    const { container } = renderMenu(items);
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));

    await expectNoAccessibilityViolations(container);
  });
});
