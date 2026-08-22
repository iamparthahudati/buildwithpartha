import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useOutletContext } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";
import { ToastProvider } from "@state/ToastProvider";
import { AuthSessionProvider } from "@state/AuthSessionProvider";

import { AppShell, type AppShellOutletContext, type AppShellProps } from "./AppShell";

const FIXED_NOW = new Date("2026-08-20T12:00:00Z");
const PREFS_BODY = {
  userId: "user-123",
  onboardingVersion: 1,
  onboardingStatus: "COMPLETED",
  lastCompletedStep: null,
  onboardingCompletedAt: null,
  planningDefaults: {
    workingDays: [1, 2, 3, 4, 5],
    workStartTime: "09:00",
    workEndTime: "17:00",
    overnightSchedule: false,
    dailyFocusTargetMinutes: 120,
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
  },
};

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

function TodayContent() {
  const { onQuickAddClick } = useOutletContext<AppShellOutletContext>();
  return (
    <>
      <p>Today content</p>
      <button type="button" onClick={() => onQuickAddClick()}>
        Open Quick Add from Today
      </button>
      <Link to="/life-os/app/tasks">Go to tasks</Link>
    </>
  );
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
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return renderWithUser(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider restoreSession={false}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/life-os/app" element={<AppShell {...defaultProps(props)} />}>
                <Route index element={<p>Today content</p>} />
                <Route path="today" element={<TodayContent />} />
                <Route path="tasks" element={<p>Tasks content</p>} />
                <Route path="settings" element={<p>Settings content</p>} />
                <Route path="boom" element={<Bomb />} />
              </Route>
            </Routes>
            {extraChildren}
          </MemoryRouter>
        </ToastProvider>
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

describe("AppShell", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    installMatchMedia(false);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(fetch).mockImplementation((url) => {
      const path = typeof url === "string" ? url : (url as Request).url;
      if (path.endsWith("/user/preferences")) {
        return Promise.resolve(
          new Response(JSON.stringify(PREFS_BODY), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (path.endsWith("/focus-sessions/active")) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
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
    const { user, container } = renderShell();

    await user.click(screen.getByRole("link", { name: "Go to tasks" }));

    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus();
    });
    const announcer = container.querySelector(
      ".lifeos-app-shell > .lifeos-visually-hidden[role='status']",
    );
    expect(announcer).toHaveTextContent("Tasks");
  });

  it("does not move focus or announce on the initial render", () => {
    const { container } = renderShell();
    expect(screen.getByRole("main")).not.toHaveFocus();
    const announcer = container.querySelector(
      ".lifeos-app-shell > .lifeos-visually-hidden[role='status']",
    );
    expect(announcer).toHaveTextContent("");
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

  it("shares its Quick Add action with routed screens through outlet context", async () => {
    const onQuickAddTriggerClick = vi.fn();
    const { user } = renderShell({ onQuickAddTriggerClick });

    await user.click(screen.getByRole("button", { name: "Open Quick Add from Today" }));
    expect(onQuickAddTriggerClick).toHaveBeenCalledTimes(1);
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
