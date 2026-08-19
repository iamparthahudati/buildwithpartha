import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Sidebar } from "./Sidebar";
import type { NavGroup } from "./navigationDestinations";
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from "./sidebarStorage";
import { Sun } from "lucide-react";

describe("Sidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders a skip link as the first link pointing to main content", () => {
    renderWithUser(<Sidebar currentPath="/life-os/app/today" />);
    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(skipLink).toHaveClass("lifeos-skip-link");
  });

  it("supports custom skip link id and label", () => {
    renderWithUser(
      <Sidebar
        currentPath="/life-os/app/today"
        skipLinkId="custom-main"
        skipLinkLabel="Skip to content"
      />,
    );
    const skipLink = screen.getByRole("link", { name: "Skip to content" });
    expect(skipLink).toHaveAttribute("href", "#custom-main");
  });

  it("renders the LifeOS brand mark linking to /life-os/app/today", () => {
    renderWithUser(<Sidebar currentPath="/life-os/app/today" />);
    const brandLink = screen.getByRole("link", { name: "LifeOS home" });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/life-os/app/today");
    expect(within(brandLink).getByText("LifeOS")).toBeInTheDocument();
  });

  it("renders all 4 canonical groups and 14 destinations", () => {
    renderWithUser(<Sidebar currentPath="/life-os/app/today" />);

    expect(screen.getByRole("heading", { name: "Execute" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Capture and grow" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reflect" })).toBeInTheDocument();

    const expectedDestinations = [
      "Today",
      "Tasks",
      "Time Blocks",
      "Projects",
      "Sprints",
      "Week Planner",
      "Calendar",
      "Goals",
      "Notes",
      "Brain Dump",
      "Habits",
      "Progress",
      "Reports",
      "Reviews",
    ];

    for (const name of expectedDestinations) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("highlights the active destination with aria-current='page'", () => {
    renderWithUser(<Sidebar currentPath="/life-os/app/tasks" />);

    const tasksLink = screen.getByRole("link", { name: "Tasks" });
    expect(tasksLink).toHaveAttribute("aria-current", "page");
    expect(tasksLink).toHaveClass("lifeos-sidebar__link--active");

    const todayLink = screen.getByRole("link", { name: "Today" });
    expect(todayLink).not.toHaveAttribute("aria-current");
    expect(todayLink).not.toHaveClass("lifeos-sidebar__link--active");
  });

  it("marks destination active for nested sub-routes", () => {
    renderWithUser(<Sidebar currentPath="/life-os/app/projects/proj-101/tasks" />);

    const projectsLink = screen.getByRole("link", { name: "Projects" });
    expect(projectsLink).toHaveAttribute("aria-current", "page");
    expect(projectsLink).toHaveClass("lifeos-sidebar__link--active");
  });

  it("renders badges when specified on navigation destinations", () => {
    const customGroups: readonly NavGroup[] = [
      {
        id: "custom",
        title: "Work",
        items: [
          {
            id: "tasks",
            label: "Tasks",
            href: "/life-os/app/tasks",
            icon: Sun,
            badge: 5,
          },
        ],
      },
    ];

    renderWithUser(<Sidebar groups={customGroups} currentPath="/life-os/app/today" />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("toggles collapse state, updates aria-expanded, and persists preference", async () => {
    const onCollapsedChange = vi.fn();
    const { user } = renderWithUser(
      <Sidebar currentPath="/life-os/app/today" onCollapsedChange={onCollapsedChange} />,
    );

    const toggleButton = screen.getByRole("button", {
      name: "Collapse navigation",
    });
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    await user.click(toggleButton);

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("true");

    const expandButton = screen.getByRole("button", {
      name: "Expand navigation",
    });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");

    await user.click(expandButton);

    expect(onCollapsedChange).toHaveBeenCalledWith(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("false");
  });

  it("respects controlled collapsed prop", async () => {
    const onCollapsedChange = vi.fn();
    const { user, rerender } = renderWithUser(
      <Sidebar
        collapsed={true}
        currentPath="/life-os/app/today"
        onCollapsedChange={onCollapsedChange}
      />,
    );

    const expandButton = screen.getByRole("button", {
      name: "Expand navigation",
    });
    expect(expandButton).toBeInTheDocument();

    await user.click(expandButton);
    expect(onCollapsedChange).toHaveBeenCalledWith(false);

    rerender(
      <Sidebar
        collapsed={false}
        currentPath="/life-os/app/today"
        onCollapsedChange={onCollapsedChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Collapse navigation" })).toBeInTheDocument();
  });

  it("restores initial collapsed state from localStorage", () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "true");
    renderWithUser(<Sidebar currentPath="/life-os/app/today" />);

    expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
  });

  it("fires onNavigate when links are clicked", async () => {
    const onNavigate = vi.fn();
    const { user } = renderWithUser(
      <Sidebar currentPath="/life-os/app/today" onNavigate={onNavigate} />,
    );

    await user.click(screen.getByRole("link", { name: "Projects" }));
    expect(onNavigate).toHaveBeenCalledWith("/life-os/app/projects", expect.anything());

    await user.click(screen.getByRole("link", { name: "LifeOS home" }));
    expect(onNavigate).toHaveBeenCalledWith("/life-os/app/today", expect.anything());
  });

  it("renders as a modal drawer when drawer is enabled and open", async () => {
    const onDrawerClose = vi.fn();
    const onNavigate = vi.fn();

    const { user } = renderWithUser(
      <Sidebar
        drawer={true}
        drawerOpen={true}
        onDrawerClose={onDrawerClose}
        onNavigate={onNavigate}
        currentPath="/life-os/app/today"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    expect(dialog).toBeInTheDocument();

    expect(within(dialog).getByRole("link", { name: "Tasks" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("link", { name: "Tasks" }));
    expect(onNavigate).toHaveBeenCalledWith("/life-os/app/tasks", expect.anything());
    expect(onDrawerClose).toHaveBeenCalled();
  });

  it("does not render when drawer is true but drawerOpen is false", () => {
    renderWithUser(<Sidebar drawer={true} drawerOpen={false} currentPath="/life-os/app/today" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });

  it("renders custom footer content when provided", () => {
    renderWithUser(
      <Sidebar
        currentPath="/life-os/app/today"
        footer={<div data-testid="custom-footer">Footer actions</div>}
      />,
    );

    expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
  });

  it("renders headerAction slot when expanded", () => {
    renderWithUser(
      <Sidebar
        currentPath="/life-os/app/today"
        collapsed={false}
        headerAction={<button type="button">Quick add</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "Quick add" })).toBeInTheDocument();
  });

  it("respects defaultCollapsed for initial uncontrolled state", () => {
    renderWithUser(<Sidebar currentPath="/life-os/app/today" defaultCollapsed={true} />);

    expect(screen.getByRole("button", { name: "Expand navigation" })).toBeInTheDocument();
  });

  it("passes accessibility axe sweep in expanded, collapsed, and drawer states", async () => {
    const { container, rerender } = renderWithUser(
      <Sidebar currentPath="/life-os/app/today" collapsed={false} />,
    );
    await expectNoAccessibilityViolations(container);

    rerender(<Sidebar currentPath="/life-os/app/today" collapsed={true} />);
    await expectNoAccessibilityViolations(container);

    rerender(<Sidebar drawer={true} drawerOpen={true} currentPath="/life-os/app/today" />);
    await expectNoAccessibilityViolations(container);
  });
});
