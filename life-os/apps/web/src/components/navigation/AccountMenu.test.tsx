import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { AccountMenu } from "./AccountMenu";
import type { MenuItemDescriptor } from "./Menu";

function itemsFixture(): {
  readonly items: readonly MenuItemDescriptor[];
  readonly onSignOut: ReturnType<typeof vi.fn>;
} {
  const onSignOut = vi.fn();
  const items: readonly MenuItemDescriptor[] = [
    { type: "item", id: "profile", label: "View profile", onSelect: vi.fn() },
    { type: "item", id: "settings", label: "Settings", onSelect: vi.fn() },
    { type: "separator", id: "sep" },
    { type: "item", id: "sign-out", label: "Sign out", onSelect: onSignOut, destructive: true },
  ];
  return { items, onSignOut };
}

describe("AccountMenu", () => {
  it("names the trigger after the person, not the picture", () => {
    const { items } = itemsFixture();
    renderWithUser(<AccountMenu name="Ada Lovelace" email="ada@example.com" items={items} />);

    expect(screen.getByRole("button", { name: "Ada Lovelace account menu" })).toBeInTheDocument();
  });

  it("shows the identity block and the caller's own items once opened", async () => {
    const { items } = itemsFixture();
    const { user } = renderWithUser(
      <AccountMenu name="Ada Lovelace" email="ada@example.com" items={items} />,
    );

    await user.click(screen.getByRole("button", { name: "Ada Lovelace account menu" }));

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveClass(
      "lifeos-menu__item--destructive",
    );
  });

  it("renders without an email when none is given", async () => {
    const { items } = itemsFixture();
    const { user } = renderWithUser(<AccountMenu name="Ada Lovelace" items={items} />);

    await user.click(screen.getByRole("button", { name: "Ada Lovelace account menu" }));
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
  });

  it("shows the picture instead of initials once an image URL is given", async () => {
    const { items } = itemsFixture();
    const { user, container } = renderWithUser(
      <AccountMenu name="Ada Lovelace" imageUrl="https://example.com/ada.png" items={items} />,
    );

    const trigger = screen.getByRole("button", { name: "Ada Lovelace account menu" });
    expect(trigger.querySelector("img")).toHaveAttribute("src", "https://example.com/ada.png");

    await user.click(trigger);
    const identityImages = [...container.querySelectorAll("img")];
    expect(identityImages).toHaveLength(2);
    expect(
      identityImages.every((image) => image.getAttribute("src") === "https://example.com/ada.png"),
    ).toBe(true);
  });

  it("selecting Sign out calls the caller's handler and closes the menu", async () => {
    const { items, onSignOut } = itemsFixture();
    const { user } = renderWithUser(<AccountMenu name="Ada Lovelace" items={items} />);

    await user.click(screen.getByRole("button", { name: "Ada Lovelace account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("has no axe violations while open", async () => {
    const { items } = itemsFixture();
    const { user, container } = renderWithUser(
      <AccountMenu name="Ada Lovelace" email="ada@example.com" items={items} />,
    );

    await user.click(screen.getByRole("button", { name: "Ada Lovelace account menu" }));
    await expectNoAccessibilityViolations(container);
  });
});
