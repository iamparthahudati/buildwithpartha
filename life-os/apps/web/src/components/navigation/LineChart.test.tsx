import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { LineChart } from "./LineChart";
import type { ChartDatum } from "./chartTypes";

const DATA: readonly ChartDatum[] = [
  { id: "mon", label: "Mon", value: 30 },
  { id: "tue", label: "Tue", value: 0 },
  { id: "wed", label: "Wed", value: -10 },
  { id: "thu", label: "Thu", value: 45000 },
];

describe("LineChart", () => {
  it("renders an accessible img-role chart with one point per datum", () => {
    renderWithUser(<LineChart data={DATA} label="Focus minutes" locale="en-US" />);

    const chart = screen.getByRole("img", { name: "Focus minutes" });
    expect(chart.querySelectorAll(".lifeos-line-chart__point")).toHaveLength(4);
  });

  it("gives each point an accessible label with its formatted value", () => {
    renderWithUser(<LineChart data={DATA} label="Focus minutes" locale="en-US" />);

    expect(screen.getByLabelText("Mon: 30")).toBeInTheDocument();
    expect(screen.getByLabelText("Wed: -10")).toBeInTheDocument();
    expect(screen.getByLabelText("Thu: 45K")).toBeInTheDocument();
  });

  it("connects points with a single polyline", () => {
    renderWithUser(<LineChart data={DATA} label="Focus minutes" locale="en-US" />);

    const chart = screen.getByRole("img", { name: "Focus minutes" });
    expect(chart.querySelectorAll(".lifeos-line-chart__line")).toHaveLength(1);
  });

  it("does not render a polyline for a single-point series", () => {
    renderWithUser(
      <LineChart data={[DATA[0] as ChartDatum]} label="Focus minutes" locale="en-US" />,
    );

    const chart = screen.getByRole("img", { name: "Focus minutes" });
    expect(chart.querySelectorAll(".lifeos-line-chart__line")).toHaveLength(0);
  });

  it("moves real keyboard focus (and the tooltip) across points with arrow keys", async () => {
    const { user } = renderWithUser(<LineChart data={DATA} label="Focus minutes" locale="en-US" />);

    await user.tab();
    expect(screen.getByLabelText("Mon: 30")).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Mon: 30");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("Tue: 0")).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Tue: 0");
  });

  it("Home and End jump to the first and last points, and ArrowLeft wraps backward", async () => {
    const { user } = renderWithUser(<LineChart data={DATA} label="Focus minutes" locale="en-US" />);

    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByLabelText("Thu: 45K")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByLabelText("Mon: 30")).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByLabelText("Thu: 45K")).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByLabelText("Mon: 30")).toHaveFocus();
  });

  it("shows the tooltip on pointer hover and hides it on pointer leave", async () => {
    const { user } = renderWithUser(<LineChart data={DATA} label="Focus minutes" locale="en-US" />);

    await user.hover(screen.getByLabelText("Wed: -10"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Wed: -10");

    await user.unhover(screen.getByLabelText("Wed: -10"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(
      <LineChart data={DATA} label="Focus minutes" locale="en-US" />,
    );
    await expectNoAccessibilityViolations(container);
  });
});
