import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoAccessibilityViolations } from "@test/accessibility";
import { renderWithUser } from "@test/render";

import { ChartFrame } from "./ChartFrame";
import type { ChartLegendItem } from "./ChartLegend";

const LEGEND: readonly ChartLegendItem[] = [
  { id: "todo", label: "To do", colorName: "blue", value: "12" },
];

describe("ChartFrame", () => {
  it("renders the title, summary and chart content while ready", () => {
    renderWithUser(
      <ChartFrame title="Tasks by status" summary="Most tasks are still to do." status="ready">
        <div>the chart</div>
      </ChartFrame>,
    );

    expect(screen.getByRole("region", { name: "Tasks by status" })).toBeInTheDocument();
    expect(screen.getByText("Most tasks are still to do.")).toBeInTheDocument();
    expect(screen.getByText("the chart")).toBeInTheDocument();
  });

  it("renders the legend only while ready", () => {
    const { rerender } = renderWithUser(
      <ChartFrame title="Tasks by status" status="ready" legend={LEGEND}>
        <div>the chart</div>
      </ChartFrame>,
    );
    expect(screen.getByRole("list", { name: "Tasks by status legend" })).toBeInTheDocument();

    rerender(
      <ChartFrame title="Tasks by status" status="loading" legend={LEGEND}>
        <div>the chart</div>
      </ChartFrame>,
    );
    expect(screen.queryByRole("list", { name: "Tasks by status legend" })).not.toBeInTheDocument();
  });

  it("shows a skeleton and announces the loading label while loading, not the chart", () => {
    renderWithUser(
      <ChartFrame title="Tasks by status" status="loading" loadingLabel="Loading tasks…">
        <div>the chart</div>
      </ChartFrame>,
    );

    expect(screen.queryByText("the chart")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading tasks…");
  });

  it("shows EmptyState with the caller's own copy while empty", () => {
    renderWithUser(
      <ChartFrame
        title="Tasks by status"
        status="empty"
        emptyTitle="No tasks in this range"
        emptyDescription="Try a wider date range."
      >
        <div>the chart</div>
      </ChartFrame>,
    );

    expect(screen.getByText("No tasks in this range")).toBeInTheDocument();
    expect(screen.getByText("Try a wider date range.")).toBeInTheDocument();
    expect(screen.queryByText("the chart")).not.toBeInTheDocument();
  });

  it("shows ErrorState with the caller's own copy and an optional retry while errored", async () => {
    const onRetry = vi.fn();
    const { user } = renderWithUser(
      <ChartFrame
        title="Tasks by status"
        status="error"
        errorTitle="Couldn't load tasks"
        onRetry={onRetry}
      >
        <div>the chart</div>
      </ChartFrame>,
    );

    expect(screen.getByText("Couldn't load tasks")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders header actions the caller supplies", () => {
    renderWithUser(
      <ChartFrame
        title="Tasks by status"
        status="ready"
        actions={<button type="button">Export</button>}
      >
        <div>the chart</div>
      </ChartFrame>,
    );

    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("the data-table toggle swaps the chart for the caller's table and back", async () => {
    const { user } = renderWithUser(
      <ChartFrame title="Tasks by status" status="ready" dataTable={<div>the table</div>}>
        <div>the chart</div>
      </ChartFrame>,
    );

    expect(screen.getByText("the chart")).toBeInTheDocument();
    expect(screen.queryByText("the table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View as table" }));
    expect(screen.queryByText("the chart")).not.toBeInTheDocument();
    expect(screen.getByText("the table")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View as chart" }));
    expect(screen.getByText("the chart")).toBeInTheDocument();
    expect(screen.queryByText("the table")).not.toBeInTheDocument();
  });

  it("does not render a data-table toggle when dataTable is not given", () => {
    renderWithUser(
      <ChartFrame title="Tasks by status" status="ready">
        <div>the chart</div>
      </ChartFrame>,
    );

    expect(screen.queryByRole("button", { name: "View as table" })).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderWithUser(
      <ChartFrame
        title="Tasks by status"
        summary="Most tasks are still to do."
        status="ready"
        legend={LEGEND}
        dataTable={<div>the table</div>}
        actions={<button type="button">Export</button>}
      >
        <div>the chart</div>
      </ChartFrame>,
    );
    await expectNoAccessibilityViolations(container);
  });
});
