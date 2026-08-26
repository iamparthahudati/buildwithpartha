import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { ProgressCategoryBreakdown } from "./ProgressCategoryBreakdown";
import type { ProgressReport } from "../model/progress";

const MOCK_REPORT: ProgressReport = {
  metricDictionaryVersion: "1.0.0",
  generatedAt: "2026-08-27T00:00:00Z",
  timeZone: "Asia/Kolkata",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  taskProgress: {
    totalCount: 10,
    completedCount: 8,
    dueCount: 2,
    overdueCount: 0,
    highPriorityCount: 1,
    blockedCount: 0,
    completionRatePercentage: 80.0,
  },
  focusProgress: {
    plannedFocusMinutes: 300,
    actualFocusMinutes: 240,
    actualBreakMinutes: 30,
    comparisonMinutes: 300,
    comparisonSource: "PLANNED_BLOCKS",
    plannedVsActualRatio: 80.0,
    categoryBreakdown: [
      { category: "Deep Work", actualMinutes: 180, percentage: 75.0 },
      { category: "Admin", actualMinutes: 60, percentage: 25.0 },
    ],
  },
  projectProgress: {
    totalCount: 3,
    statusCounts: { IN_PROGRESS: 2, COMPLETED: 1 },
    averageProgressPercentage: 70.0,
  },
  goalProgress: {
    totalCount: 2,
    averageProgressPercentage: 80.0,
    goalsWithRecentCheckinCount: 2,
  },
  habitProgress: {
    totalCount: 4,
    completionRatePercentage: 85.0,
  },
  reviewProgress: {
    dailyStreakDays: 7,
    finalizedReviewsCount: 14,
  },
  summaryText: "Recorded 240 actual focus minutes across 2 categories.",
};

describe("ProgressCategoryBreakdown", () => {
  it("renders category breakdown donut chart and passes accessibility audit", async () => {
    const { container } = render(<ProgressCategoryBreakdown report={MOCK_REPORT} />);

    expect(screen.getByText("Focus Time Category Breakdown")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View as table" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("swaps to data table view when button is clicked", () => {
    render(<ProgressCategoryBreakdown report={MOCK_REPORT} />);

    fireEvent.click(screen.getByRole("button", { name: "View as table" }));
    expect(
      screen.getByRole("table", { name: "Category breakdown table alternative" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Deep Work")).toBeInTheDocument();
    expect(screen.getByText("180 min")).toBeInTheDocument();
  });
});
