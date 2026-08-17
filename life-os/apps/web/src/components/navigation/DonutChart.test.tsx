import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { DonutChart } from "./DonutChart";
import type { ChartDatum } from "./chartTypes";

const DATA: readonly ChartDatum[] = [
  { id: "todo", label: "To do", value: 12, colorName: "blue" },
  { id: "in-progress", label: "In progress", value: 5 },
  { id: "done", label: "Done", value: 8 },
];

describe("DonutChart", () => {
  it("renders an accessible img-role chart with one slice per datum", () => {
    renderWithUser(<DonutChart data={DATA} label="Tasks by status" locale="en-US" />);

    const chart = screen.getByRole("img", { name: "Tasks by status" });
    expect(chart.querySelectorAll(".lifeos-donut-chart__slice")).toHaveLength(3);
  });

  it("gives each slice an accessible label with its value and share of the total", () => {
    renderWithUser(<DonutChart data={DATA} label="Tasks by status" locale="en-US" />);

    expect(screen.getByLabelText("To do: 12, 48%")).toBeInTheDocument();
    expect(screen.getByLabelText("Done: 8, 32%")).toBeInTheDocument();
  });

  it("shows the total in the center by default", () => {
    renderWithUser(<DonutChart data={DATA} label="Tasks by status" locale="en-US" />);

    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("a caller-supplied centerText overrides the default total", () => {
    renderWithUser(
      <DonutChart data={DATA} label="Tasks by status" locale="en-US" centerText="25 tasks" />,
    );

    expect(screen.getByText("25 tasks")).toBeInTheDocument();
  });

  it("renders a plain empty track, not zero-sweep slices, when every value is zero or negative", () => {
    const allZero: readonly ChartDatum[] = [
      { id: "a", label: "A", value: 0 },
      { id: "b", label: "B", value: -3 },
    ];
    renderWithUser(<DonutChart data={allZero} label="Tasks by status" locale="en-US" />);

    const chart = screen.getByRole("img", { name: "Tasks by status" });
    expect(chart.querySelectorAll(".lifeos-donut-chart__slice")).toHaveLength(0);
    expect(chart.querySelectorAll(".lifeos-donut-chart__empty-track")).toHaveLength(1);
  });

  it("moves real keyboard focus (and the tooltip) across slices with arrow keys", async () => {
    const { user } = renderWithUser(
      <DonutChart data={DATA} label="Tasks by status" locale="en-US" />,
    );

    await user.tab();
    expect(screen.getByLabelText("To do: 12, 48%")).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("To do: 12 (48%)");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("In progress: 5, 20%")).toHaveFocus();
  });

  it("Home and End jump to the first and last slices", async () => {
    const { user } = renderWithUser(
      <DonutChart data={DATA} label="Tasks by status" locale="en-US" />,
    );

    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByLabelText("Done: 8, 32%")).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByLabelText("To do: 12, 48%")).toHaveFocus();
  });

  it("shows the tooltip on pointer hover and hides it on pointer leave", async () => {
    const { user } = renderWithUser(
      <DonutChart data={DATA} label="Tasks by status" locale="en-US" />,
    );

    await user.hover(screen.getByLabelText("Done: 8, 32%"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Done: 8 (32%)");

    await user.unhover(screen.getByLabelText("Done: 8, 32%"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(
      <DonutChart data={DATA} label="Tasks by status" locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
