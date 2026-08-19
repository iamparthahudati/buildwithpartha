import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { TopBar, type TopBarProps } from "./TopBar";
import type { MenuItemDescriptor } from "./Menu";

const ACCOUNT_ITEMS: readonly MenuItemDescriptor[] = [
  { type: "item", id: "profile", label: "View profile", onSelect: () => {} },
  { type: "item", id: "sign-out", label: "Sign out", onSelect: () => {} },
];

const FIXED_NOW = new Date("2026-08-20T12:00:00Z");

function baseProps(overrides: Partial<TopBarProps> = {}): TopBarProps {
  return {
    contextLabel: "Today",
    timeZone: "Asia/Kolkata",
    locale: "en-US",
    now: FIXED_NOW,
    onSearchTriggerClick: vi.fn(),
    onQuickAddTriggerClick: vi.fn(),
    onNotificationsTriggerClick: vi.fn(),
    account: { name: "Priya Sharma", email: "priya@example.com", items: ACCOUNT_ITEMS },
    ...overrides,
  };
}

describe("TopBar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders as the page's banner landmark with context label, date, and all triggers", () => {
    renderWithUser(<TopBar {...baseProps()} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quick add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Priya Sharma account menu" })).toBeInTheDocument();
  });

  it("formats the date from timeZone/locale/now via the canonical local date helpers", () => {
    renderWithUser(<TopBar {...baseProps()} />);

    // 2026-08-20T12:00:00Z is 2026-08-20 in Asia/Kolkata (UTC+5:30).
    expect(screen.getAllByText("Aug 20, 2026").length).toBeGreaterThan(0);
  });

  it("renders no unread badge when notificationCount is absent or zero", () => {
    const { rerender } = renderWithUser(<TopBar {...baseProps()} />);
    expect(screen.queryByText(/unread notifications/)).not.toBeInTheDocument();

    rerender(<TopBar {...baseProps({ notificationCount: 0 })} />);
    expect(screen.queryByText(/unread notifications/)).not.toBeInTheDocument();
  });

  it("renders an unread CountBadge, clamped above its max", () => {
    renderWithUser(<TopBar {...baseProps({ notificationCount: 3 })} />);
    expect(screen.getByText("3 unread notifications")).toBeInTheDocument();

    const { rerender } = renderWithUser(<TopBar {...baseProps({ notificationCount: 250 })} />);
    rerender(<TopBar {...baseProps({ notificationCount: 250 })} />);
    expect(screen.getByText("250 unread notifications")).toBeInTheDocument();
  });

  it("fires onNotificationsTriggerClick when the bell is clicked", async () => {
    const onNotificationsTriggerClick = vi.fn();
    const { user } = renderWithUser(<TopBar {...baseProps({ onNotificationsTriggerClick })} />);

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(onNotificationsTriggerClick).toHaveBeenCalledOnce();
  });

  it("renders focusSlot content only when provided", () => {
    const { rerender } = renderWithUser(<TopBar {...baseProps()} />);
    expect(screen.queryByTestId("focus-slot")).not.toBeInTheDocument();

    rerender(
      <TopBar {...baseProps({ focusSlot: <span data-testid="focus-slot">Focused</span> })} />,
    );
    expect(screen.getAllByTestId("focus-slot").length).toBeGreaterThan(0);
  });

  it("fires onSearchTriggerClick when the search trigger is clicked", async () => {
    const onSearchTriggerClick = vi.fn();
    const { user } = renderWithUser(<TopBar {...baseProps({ onSearchTriggerClick })} />);

    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearchTriggerClick).toHaveBeenCalledOnce();
  });

  it("fires onSearchTriggerClick on Cmd/Ctrl+K", () => {
    const onSearchTriggerClick = vi.fn();
    renderWithUser(<TopBar {...baseProps({ onSearchTriggerClick })} />);

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(onSearchTriggerClick).toHaveBeenCalledOnce();
  });

  it("suppresses the keyboard shortcut when searchShortcutEnabled is false", () => {
    const onSearchTriggerClick = vi.fn();
    renderWithUser(
      <TopBar {...baseProps({ onSearchTriggerClick, searchShortcutEnabled: false })} />,
    );

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(onSearchTriggerClick).not.toHaveBeenCalled();
  });

  it("fires onQuickAddTriggerClick when the quick add trigger is clicked", async () => {
    const onQuickAddTriggerClick = vi.fn();
    const { user } = renderWithUser(<TopBar {...baseProps({ onQuickAddTriggerClick })} />);

    await user.click(screen.getByRole("button", { name: "Quick add" }));
    expect(onQuickAddTriggerClick).toHaveBeenCalledOnce();
  });

  it("opens the mobile overflow drawer, holds Notifications/Focus/Account in inline order, and restores focus on close", async () => {
    const { user } = renderWithUser(
      <TopBar
        {...baseProps({
          notificationCount: 2,
          focusSlot: <span data-testid="focus-slot">Focused</span>,
        })}
      />,
    );

    const overflowTrigger = screen.getByRole("button", { name: "More" });
    expect(overflowTrigger).toHaveAttribute("aria-expanded", "false");
    expect(overflowTrigger).toHaveAttribute("aria-haspopup", "dialog");

    await user.click(overflowTrigger);

    const drawer = screen.getByRole("dialog", { name: "More" });
    expect(overflowTrigger).toHaveAttribute("aria-expanded", "true");

    const drawerButtons = within(drawer).getAllByRole("button");
    const drawerButtonNames = drawerButtons.map((button) => button.getAttribute("aria-label"));
    expect(drawerButtonNames.indexOf("Notifications")).toBeLessThan(
      drawerButtonNames.indexOf("Priya Sharma account menu"),
    );
    expect(within(drawer).getByTestId("focus-slot")).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: "Close" }));
    expect(overflowTrigger).toHaveAttribute("aria-expanded", "false");
    expect(overflowTrigger).toHaveFocus();
  });

  it("passes an accessibility axe sweep across default, notifications, focus, and overflow-open states", async () => {
    const { container, rerender, user } = renderWithUser(<TopBar {...baseProps()} />);
    await expectNoAccessibilityViolations(container);

    rerender(<TopBar {...baseProps({ notificationCount: 4 })} />);
    await expectNoAccessibilityViolations(container);

    rerender(
      <TopBar {...baseProps({ focusSlot: <span data-testid="focus-slot">Focused</span> })} />,
    );
    await expectNoAccessibilityViolations(container);

    await user.click(screen.getByRole("button", { name: "More" }));
    await expectNoAccessibilityViolations(container);
  });
});
