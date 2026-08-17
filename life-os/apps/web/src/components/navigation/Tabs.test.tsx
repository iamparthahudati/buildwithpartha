import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { Tabs, type TabItem } from "./Tabs";

const ITEMS: readonly TabItem[] = [
  { id: "overview", label: "Overview", panel: <p>Overview content</p> },
  { id: "activity", label: "Activity", panel: <p>Activity content</p>, badge: <span>3</span> },
  { id: "settings", label: "Settings", panel: <p>Settings content</p>, disabled: true },
  { id: "archive", label: "Archive", panel: <p>Archive content</p> },
];

function ControlledTabs(props: {
  readonly initialId?: string;
  readonly items?: readonly TabItem[];
}) {
  const [selectedId, setSelectedId] = useState(props.initialId ?? "overview");
  return (
    <>
      <Tabs
        items={props.items ?? ITEMS}
        selectedId={selectedId}
        onSelectedIdChange={setSelectedId}
        label="Project views"
      />
      {/* Simulates an external, non-Tabs-driven selection change — a URL
          param moving because of the browser's own Back button, say. */}
      <button type="button" onClick={() => setSelectedId("archive")}>
        Jump to archive externally
      </button>
    </>
  );
}

describe("Tabs", () => {
  it("renders a tablist with the correct roles and initial selection", () => {
    renderWithUser(<ControlledTabs />);

    const tablist = screen.getByRole("tablist", { name: "Project views" });
    expect(tablist).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /^Activity/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("shows only the selected panel and mounts nothing for unvisited tabs", () => {
    renderWithUser(<ControlledTabs />);

    expect(screen.getByText("Overview content")).toBeVisible();
    expect(screen.queryByText("Activity content")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive content")).not.toBeInTheDocument();
  });

  it("clicking a tab selects it, mounts its panel and keeps the previous one mounted but hidden", async () => {
    const { user } = renderWithUser(<ControlledTabs />);

    await user.click(screen.getByRole("tab", { name: /^Activity/ }));

    expect(screen.getByText("Activity content")).toBeVisible();
    const overviewPanel = screen.getByText("Overview content").closest('[role="tabpanel"]');
    expect(overviewPanel).not.toBeVisible();
    expect(overviewPanel).toBeInTheDocument();
  });

  it("renders caller-supplied badge content inside the tab", () => {
    renderWithUser(<ControlledTabs />);
    const activityTab = screen.getByRole("tab", { name: /Activity/ });
    expect(activityTab).toHaveTextContent("3");
  });

  it("ArrowRight moves focus and selection to the next enabled tab, skipping the disabled one", async () => {
    const { user } = renderWithUser(<ControlledTabs />);

    await user.click(screen.getByRole("tab", { name: /^Activity/ }));
    await user.keyboard("{ArrowRight}");

    const archiveTab = screen.getByRole("tab", { name: "Archive" });
    expect(archiveTab).toHaveFocus();
    expect(archiveTab).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowLeft wraps from the first enabled tab to the last", async () => {
    const { user } = renderWithUser(<ControlledTabs />);

    screen.getByRole("tab", { name: "Overview" }).focus();
    await user.keyboard("{ArrowLeft}");

    const archiveTab = screen.getByRole("tab", { name: "Archive" });
    expect(archiveTab).toHaveFocus();
    expect(archiveTab).toHaveAttribute("aria-selected", "true");
  });

  it("Home and End jump to the first and last enabled tabs", async () => {
    const { user } = renderWithUser(<ControlledTabs />);

    screen.getByRole("tab", { name: /^Activity/ }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Archive" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();
  });

  it("an unrelated keypress does nothing", async () => {
    const { user } = renderWithUser(<ControlledTabs />);

    screen.getByRole("tab", { name: "Overview" }).focus();
    await user.keyboard("a");

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("a disabled tab is not selectable and is excluded from keyboard navigation", () => {
    renderWithUser(<ControlledTabs />);
    expect(screen.getByRole("tab", { name: "Settings" })).toBeDisabled();
  });

  it("only the selected tab is in the roving tab order", () => {
    renderWithUser(<ControlledTabs />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("tabIndex", "0");
    expect(screen.getByRole("tab", { name: /^Activity/ })).toHaveAttribute("tabIndex", "-1");
  });

  it("mounts a panel selected from outside the tablist entirely, not just from its own handlers", async () => {
    const { user } = renderWithUser(<ControlledTabs />);

    await user.click(screen.getByRole("button", { name: "Jump to archive externally" }));

    expect(screen.getByRole("tab", { name: "Archive" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Archive content")).toBeVisible();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(<ControlledTabs />);
    await expectNoAccessibilityViolations(container);
  });
});
