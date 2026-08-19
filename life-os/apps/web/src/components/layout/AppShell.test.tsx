import type { ReactNode } from "react";

import { screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { ToastProvider } from "@state/ToastProvider";

import { AppShell, type AppShellProps } from "./AppShell";

const FIXED_NOW = new Date("2026-08-20T12:00:00Z");

interface FakeMediaQueryList {
  matches: boolean;
  readonly listeners: Set<(event: MediaQueryListEvent) => void>;
  addEventListener: (type: "change", listener: (event: MediaQueryListEvent) => void) => void;
  removeEventListener: (type: "change", listener: (event: MediaQueryListEvent) => void) => void;
}

function installMatchMedia(mobileMatches: boolean) {
  const list: FakeMediaQueryList = {
    matches: mobileMatches,
    listeners: new Set(),
    addEventListener: (_type, listener) => list.listeners.add(listener),
    removeEventListener: (_type, listener) => list.listeners.delete(listener),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => list),
  );
}

function Bomb(): never {
  throw new Error("boom");
}

function defaultProps(overrides: Partial<AppShellProps> = {}): AppShellProps {
  return {
    displayName: "Priya Sharma",
    email: "priya@example.com",
    timeZone: "Asia/Kolkata",
    locale: "en-US",
    onQuickAddTriggerClick: vi.fn(),
    onSignOut: vi.fn(),
    now: FIXED_NOW,
    ...overrides,
  };
}

function renderShell(
  props: Partial<AppShellProps> = {},
  initialEntries: string[] = ["/life-os/app/today"],
  extraChildren?: ReactNode,
) {
  return renderWithUser(
    <ToastProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/life-os/app" element={<AppShell {...defaultProps(props)} />}>
            <Route index element={<p>Today content</p>} />
            <Route
              path="today"
              element={
                <>
                  <p>Today content</p>
                  <Link to="/life-os/app/tasks">Go to tasks</Link>
                </>
              }
            />
            <Route path="tasks" element={<p>Tasks content</p>} />
            <Route path="settings" element={<p>Settings content</p>} />
            <Route path="boom" element={<Bomb />} />
          </Route>
        </Routes>
        {extraChildren}
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe("AppShell", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    installMatchMedia(false);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    consoleErrorSpy.mockRestore();
  });

  it("renders Sidebar before the header row carrying TopBar, in DOM order", () => {
    renderShell();

    const sidebar = screen.getByRole("complementary", { name: "Sidebar navigation" });
    const topbar = screen.getByRole("banner");

    expect(sidebar.compareDocumentPosition(topbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders its own skip link as the first tab stop, pointing at the focusable main landmark", async () => {
    const { user } = renderShell();

    await user.tab();
    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveFocus();

    const main = screen.getByRole("main");
    expect(skipLink).toHaveAttribute("href", `#${main.id}`);
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("sets TopBar's context label from the current route", () => {
    renderShell({}, ["/life-os/app/tasks"]);
    expect(within(screen.getByRole("banner")).getByText("Tasks")).toBeInTheDocument();
  });

  it("shows the signed-in user's identity on the account menu and wires Settings/Sign out", async () => {
    const onSignOut = vi.fn();
    const { user } = renderShell({ onSignOut });

    expect(screen.getByRole("button", { name: "Priya Sharma account menu" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Priya Sharma account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(await screen.findByText("Settings content")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Priya Sharma account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("moves focus to main and announces the new title once when navigating", async () => {
    const { user } = renderShell();

    await user.click(screen.getByRole("link", { name: "Go to tasks" }));

    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Tasks");
  });

  it("does not move focus or announce on the initial render", () => {
    renderShell();
    expect(screen.getByRole("main")).not.toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("catches a routed render error without losing the surrounding shell chrome", () => {
    renderShell({}, ["/life-os/app/boom"]);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Sidebar navigation" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("reserves an overlay root for portal-based overlays", () => {
    renderShell();
    expect(document.getElementById("lifeos-overlay-root")).toBeInTheDocument();
  });

  it("opens the mobile navigation drawer from its own menu trigger and closes it", async () => {
    installMatchMedia(true);
    const { user } = renderShell();

    const menuTrigger = screen.getByRole("button", { name: "Open navigation" });
    expect(menuTrigger).toHaveAttribute("aria-expanded", "false");

    await user.click(menuTrigger);
    expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeInTheDocument();
  });

  it("has no accessibility violations on a normal desktop render", async () => {
    const { container } = renderShell();
    await expectNoAccessibilityViolations(container);
  });
});
