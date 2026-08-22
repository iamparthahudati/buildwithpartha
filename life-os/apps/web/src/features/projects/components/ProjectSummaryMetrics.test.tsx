import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectSummaryMetrics, type ProjectSummaryCounts } from "./ProjectSummaryMetrics";

describe("ProjectSummaryMetrics", () => {
  const sampleCounts: ProjectSummaryCounts = {
    total: 12,
    active: 6,
    completed: 4,
    onHold: 1,
    atRisk: 1,
    averageProgress: 68,
  };

  it("renders ready counts accurately across all metric cards", () => {
    render(<ProjectSummaryMetrics counts={sampleCounts} />);

    expect(screen.getByText("Total projects")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    expect(screen.getByText("Active projects")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.getByText("On hold")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBe(2);

    expect(screen.getByText("At risk / Off track")).toBeInTheDocument();

    expect(screen.getByText("Average progress")).toBeInTheDocument();
    expect(screen.getByText("68%")).toBeInTheDocument();
  });

  it("renders 0% when average progress is missing or not a number", () => {
    render(
      <ProjectSummaryMetrics
        counts={{
          ...sampleCounts,
          averageProgress: Number.NaN,
        }}
      />,
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
  });

  it("renders loading state across all metrics", () => {
    render(<ProjectSummaryMetrics loading />);

    expect(screen.getByText("Total projects")).toBeInTheDocument();
    expect(screen.getByText("Active projects")).toBeInTheDocument();
    // Loading skeletons present in place of values
  });

  it("renders error state and triggers onRetry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ProjectSummaryMetrics error="Failed to load metric counts" onRetry={onRetry} />);

    const errorMessages = screen.getAllByText("Failed to load metric counts");
    expect(errorMessages.length).toBeGreaterThan(0);

    const retryButtons = screen.getAllByRole("button", { name: "Try again" });
    expect(retryButtons[0]).toBeDefined();
    await user.click(retryButtons[0]!);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("invokes onSelectFilter when filter action buttons are clicked", async () => {
    const user = userEvent.setup();
    const onSelectFilter = vi.fn();

    render(
      <ProjectSummaryMetrics
        counts={sampleCounts}
        activeFilter="ALL"
        onSelectFilter={onSelectFilter}
      />,
    );

    const filterBtns = screen.getAllByRole("button", { name: /Filter/i });
    expect(filterBtns[1]).toBeDefined();
    await user.click(filterBtns[1]!); // Active projects filter button

    expect(onSelectFilter).toHaveBeenCalledWith("ACTIVE");
  });
});
