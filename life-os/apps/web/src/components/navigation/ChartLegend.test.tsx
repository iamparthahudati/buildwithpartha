import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ChartLegend, type ChartLegendItem } from "./ChartLegend";

const ITEMS: readonly ChartLegendItem[] = [
  { id: "todo", label: "To do", colorName: "blue", value: "12" },
  { id: "done", label: "Done", colorName: "green", value: "8" },
];

describe("ChartLegend", () => {
  it("renders each item's label and value with an accessible name", () => {
    renderWithUser(<ChartLegend items={ITEMS} label="Tasks by status" />);

    expect(screen.getByRole("list", { name: "Tasks by status" })).toBeInTheDocument();
    expect(screen.getByText("To do")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders plain, non-interactive rows when no item has onToggle", () => {
    renderWithUser(<ChartLegend items={ITEMS} label="Tasks by status" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a toggle button reflecting active state when onToggle is given", async () => {
    const onToggle = vi.fn();
    const items: readonly ChartLegendItem[] = [
      { id: "todo", label: "To do", colorName: "blue", active: true, onToggle },
    ];
    const { user } = renderWithUser(<ChartLegend items={items} label="Tasks by status" />);

    const button = screen.getByRole("button", { name: /To do/ });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("marks an inactive toggle item aria-pressed=false", () => {
    const items: readonly ChartLegendItem[] = [
      { id: "todo", label: "To do", colorName: "blue", active: false, onToggle: vi.fn() },
    ];
    renderWithUser(<ChartLegend items={items} label="Tasks by status" />);

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("falls back to the first chart token for an unrecognized color name defensively", () => {
    // TypeScript would reject this at the call site; cast to simulate bad
    // data reaching the component anyway (e.g. from an untyped API response).
    const items = [
      { id: "x", label: "Unknown", colorName: "not-a-color" },
    ] as unknown as readonly ChartLegendItem[];
    renderWithUser(<ChartLegend items={items} label="Legend" />);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const items: readonly ChartLegendItem[] = [
      { id: "todo", label: "To do", colorName: "blue", active: true, onToggle: vi.fn() },
      { id: "done", label: "Done", colorName: "green" },
    ];
    const { container } = renderWithUser(<ChartLegend items={items} label="Tasks by status" />);
    await expectNoAccessibilityViolations(container);
  });
});
