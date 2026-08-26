import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { ProgressSummaryCards } from "./ProgressSummaryCards";
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
  summaryText: "During this period, 15 tasks were completed and 480 focus minutes were recorded.",
};

describe("ProgressSummaryCards", () => {
  it("renders metric cards with report values and passes accessibility audit", async () => {
    const { container } = render(<ProgressSummaryCards report={MOCK_REPORT} />);

    expect(screen.getByText("Task Completion")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Focus Time")).toBeInTheDocument();
    expect(screen.getByText("480 min")).toBeInTheDocument();
    expect(screen.getByText("Review Streak")).toBeInTheDocument();
    expect(screen.getByText("12 days")).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });

  it("renders loading skeletons", () => {
    render(<ProgressSummaryCards loading />);
    expect(screen.getByLabelText("Loading progress summary metrics")).toBeInTheDocument();
  });
});
