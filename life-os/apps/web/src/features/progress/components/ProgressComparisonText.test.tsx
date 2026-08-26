import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAccessibilityViolations } from "@test/accessibility";
import { ProgressComparisonText } from "./ProgressComparisonText";
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
    categoryBreakdown: [],
  },
  projectProgress: {
    totalCount: 3,
    statusCounts: {},
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
  summaryText: "In this period, 8 tasks were completed coincided with 240 focus minutes.",
};

describe("ProgressComparisonText", () => {
  it("renders non-causal descriptive insights and passes accessibility audit", async () => {
    const { container } = render(<ProgressComparisonText report={MOCK_REPORT} />);

    expect(screen.getByText("Descriptive Insights")).toBeInTheDocument();
    expect(
      screen.getByText("In this period, 8 tasks were completed coincided with 240 focus minutes."),
    ).toBeInTheDocument();
    expect(screen.getByText(/non-causal claims enforcement active/i)).toBeInTheDocument();

    await expectNoAccessibilityViolations(container);
  });
});
