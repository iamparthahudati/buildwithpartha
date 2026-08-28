import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { ProgressTrendsChart } from "./ProgressTrendsChart";
import type { ProgressReport } from "../model/progress";

const MOCK_REPORT: ProgressReport = {
  metricDictionaryVersion: "1.0.0",
  generatedAt: "2026-08-27T00:00:00Z",
  timeZone: "Asia/Kolkata",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  taskProgress: {
    totalCount: 20,
    completedCount: 15,
    dueCount: 3,
    overdueCount: 1,
    highPriorityCount: 2,
    blockedCount: 0,
    completionRatePercentage: 75.0,
  },
  focusProgress: {
    plannedFocusMinutes: 600,
    actualFocusMinutes: 480,
    actualBreakMinutes: 90,
    comparisonMinutes: 600,
    comparisonSource: "PLANNED_BLOCKS",
    plannedVsActualRatio: 80.0,
    categoryBreakdown: [
      { category: "Deep Work", actualMinutes: 300, percentage: 62.5 },
      { category: "Learning", actualMinutes: 180, percentage: 37.5 },
    ],
  },
  projectProgress: {
    totalCount: 5,
    statusCounts: { IN_PROGRESS: 3, COMPLETED: 2 },
    averageProgressPercentage: 68.5,
  },
  goalProgress: {
    totalCount: 4,
    averageProgressPercentage: 82.0,
    goalsWithRecentCheckinCount: 3,
  },
  habitProgress: {
    totalCount: 6,
    completionRatePercentage: 90.0,
  },
  reviewProgress: {
    dailyStreakDays: 12,
    finalizedReviewsCount: 25,
  },
  summaryText: "During this period, 15 tasks were completed.",
};

describe("ProgressTrendsChart", () => {
  it("renders chart frame with data and passes accessibility audit", async () => {
    const { container } = render(<ProgressTrendsChart report={MOCK_REPORT} />);

    expect(screen.getByText("Focus & Task Execution Trends")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View as table" })).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("toggles table view alternative when button is clicked", () => {
    render(<ProgressTrendsChart report={MOCK_REPORT} />);

    const toggleBtn = screen.getByRole("button", { name: "View as table" });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole("button", { name: "View as chart" })).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Progress trends table alternative" }),
    ).toBeInTheDocument();
  });
});
