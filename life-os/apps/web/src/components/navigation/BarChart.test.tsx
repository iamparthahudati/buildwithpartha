import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { BarChart } from "./BarChart";
import type { ChartDatum } from "./chartTypes";

const DATA: readonly ChartDatum[] = [
  { id: "mon", label: "Mon", value: 4, colorName: "blue" },
  { id: "tue", label: "Tue", value: 0 },
  { id: "wed", label: "Wed", value: -2 },
  { id: "thu", label: "Thu", value: 12345 },
];

describe("BarChart", () => {
  it("renders an accessible img-role chart with one bar per datum", () => {
    renderWithUser(<BarChart data={DATA} label="Tasks completed" locale="en-US" />);

    const chart = screen.getByRole("img", { name: "Tasks completed" });
    expect(chart).toBeInTheDocument();
    expect(chart.querySelectorAll(".lifeos-bar-chart__bar")).toHaveLength(4);
  });

  it("gives each bar an accessible label with its formatted value", () => {
    renderWithUser(<BarChart data={DATA} label="Tasks completed" locale="en-US" />);

    expect(screen.getByLabelText("Mon: 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Tue: 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Wed: -2")).toBeInTheDocument();
    expect(screen.getByLabelText("Thu: 12.3K")).toBeInTheDocument();
  });

  it("only the roving bar is a tab stop; ArrowRight/ArrowLeft move it, Home/End jump to the ends", async () => {
    const { user } = renderWithUser(
      <BarChart data={DATA} label="Tasks completed" locale="en-US" />,
    );

    const bars = screen.getAllByLabelText(/.+:/);
    expect(bars[0]).toHaveAttribute("tabindex", "0");
    expect(bars[1]).toHaveAttribute("tabindex", "-1");

    bars[0]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("Tue: 0")).toHaveAttribute("tabindex", "0");
    expect(screen.getByLabelText("Mon: 4")).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByLabelText("Mon: 4")).toHaveAttribute("tabindex", "0");

    await user.keyboard("{End}");
    expect(screen.getByLabelText("Thu: 12.3K")).toHaveAttribute("tabindex", "0");

    await user.keyboard("{Home}");
    expect(screen.getByLabelText("Mon: 4")).toHaveAttribute("tabindex", "0");
  });

  it("shows the focused bar's value in a tooltip and hides it again on blur", async () => {
    const { user } = renderWithUser(
      <BarChart data={DATA} label="Tasks completed" locale="en-US" />,
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByLabelText("Mon: 4")).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Mon: 4");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Tue: 0");
  });

  it("renders category labels", () => {
    renderWithUser(<BarChart data={DATA} label="Tasks completed" locale="en-US" />);

    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
  });

  it("accepts an empty data set without throwing", () => {
    renderWithUser(<BarChart data={[]} label="Tasks completed" locale="en-US" />);

    expect(screen.getByRole("img", { name: "Tasks completed" })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(
      <BarChart data={DATA} label="Tasks completed" locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
