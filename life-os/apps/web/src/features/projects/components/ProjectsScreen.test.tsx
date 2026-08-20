import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectsScreen } from "./ProjectsScreen";

describe("ProjectsScreen", () => {
  it("renders page header, metric strip, controls, and default project cards", () => {
    render(<ProjectsScreen />);

    expect(screen.getByRole("heading", { name: "Projects", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add project/i })).toBeInTheDocument();

    // Summary metrics present
    expect(screen.getByText("Total projects")).toBeInTheDocument();
    expect(screen.getByText("Active projects")).toBeInTheDocument();

    // Default mock projects
    expect(
      screen.getByRole("link", { name: "Open project: Launch Platform v1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open project: Mobile PWA Expansion" }),
    ).toBeInTheDocument();
  });

  it("opens create project dialog when Add project button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProjectsScreen />);

    const addBtn = screen.getByRole("button", { name: /Add project/i });
    await user.click(addBtn);

    expect(screen.getByRole("heading", { name: "Create project" })).toBeInTheDocument();
  });

  it("filters projects by status tab selection", async () => {
    const user = userEvent.setup();
    render(<ProjectsScreen />);

    // Initially "Launch Platform v1" (ACTIVE) is visible
    expect(
      screen.getByRole("link", { name: "Open project: Launch Platform v1" }),
    ).toBeInTheDocument();

    // Click "Completed" tab
    const completedTab = screen.getByRole("tab", { name: "Completed" });
    await user.click(completedTab);

    expect(
      screen.queryByRole("link", { name: "Open project: Launch Platform v1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open project: Identity & Security Audit" }),
    ).toBeInTheDocument();
  });

  it("searches projects by query text", async () => {
    const user = userEvent.setup();
    render(<ProjectsScreen />);

    const searchInput = screen.getByPlaceholderText("Search projects...");
    await user.type(searchInput, "Mobile PWA");

    expect(
      screen.getByRole("link", { name: "Open project: Mobile PWA Expansion" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open project: Launch Platform v1" }),
    ).not.toBeInTheDocument();
  });

  it("renders empty state when search filters return zero results", async () => {
    const user = userEvent.setup();
    render(<ProjectsScreen />);

    const searchInput = screen.getByPlaceholderText("Search projects...");
    await user.type(searchInput, "Nonexistent term 12345");

    expect(screen.getByText("No matching projects")).toBeInTheDocument();
    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    await user.click(clearBtn);

    expect(
      screen.getByRole("link", { name: "Open project: Launch Platform v1" }),
    ).toBeInTheDocument();
  });

  it("renders loading state", () => {
    render(<ProjectsScreen loading />);

    expect(screen.getByTestId("projects-loading")).toBeInTheDocument();
  });

  it("renders error state and handles onRetry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ProjectsScreen error="Failed to fetch projects from server." onRetry={onRetry} />);

    expect(screen.getByText("Failed to load projects")).toBeInTheDocument();

    const retryBtns = screen.getAllByRole("button", { name: "Try again" });
    await user.click(retryBtns[0]);

    expect(onRetry).toHaveBeenCalled();
  });

  it("opens archive confirmation dialog when archive action is triggered", async () => {
    const user = userEvent.setup();
    render(<ProjectsScreen />);

    const menuBtns = screen.getAllByRole("button", { name: "Project actions" });
    await user.click(menuBtns[0]);

    const archiveItem = screen.getByRole("menuitem", { name: "Archive" });
    await user.click(archiveItem);

    expect(
      screen.getByRole("heading", { name: /Archive "Documentation Refresh"\?/i }),
    ).toBeInTheDocument();
  });
});
