import { useState } from "react";
import {
  PeriodControls,
  ProgressSummaryCards,
  ProgressTrendsChart,
  ProgressCategoryBreakdown,
  ProgressComparisonText,
  ProgressEmptyState,
  ProgressErrorState,
  type ProgressFilterParams,
  type ProgressReport,
} from "@features/progress";

const MOCK_REPORT: ProgressReport = {
  metricDictionaryVersion: "1.0.0",
  generatedAt: "2026-08-27T00:00:00Z",
  timeZone: "Asia/Kolkata",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  taskProgress: {
    totalCount: 25,
    completedCount: 18,
    dueCount: 4,
    overdueCount: 1,
    highPriorityCount: 3,
    blockedCount: 0,
    completionRatePercentage: 72.0,
  },
  focusProgress: {
    plannedFocusMinutes: 800,
    actualFocusMinutes: 650,
    actualBreakMinutes: 120,
    comparisonMinutes: 800,
    comparisonSource: "PLANNED_BLOCKS",
    plannedVsActualRatio: 81.25,
    categoryBreakdown: [
      { category: "Engineering", actualMinutes: 400, percentage: 61.5 },
      { category: "Product", actualMinutes: 150, percentage: 23.1 },
      { category: "Learning", actualMinutes: 100, percentage: 15.4 },
    ],
  },
  projectProgress: {
    totalCount: 6,
    statusCounts: { IN_PROGRESS: 4, COMPLETED: 2 },
    averageProgressPercentage: 75.0,
  },
  goalProgress: {
    totalCount: 5,
    averageProgressPercentage: 80.0,
    goalsWithRecentCheckinCount: 4,
  },
  habitProgress: {
    totalCount: 8,
    completionRatePercentage: 87.5,
  },
  reviewProgress: {
    dailyStreakDays: 14,
    finalizedReviewsCount: 28,
  },
  summaryText:
    "During this period, 18 tasks were completed and 650 focus minutes were recorded across 3 categories.",
};

export function PeriodControlsDemo() {
  const [filter, setFilter] = useState<ProgressFilterParams>({
    periodPreset: "THIS_MONTH",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div style={{ maxWidth: 840 }}>
      <PeriodControls value={filter} onChange={setFilter} />
    </div>
  );
}

export function ProgressSummaryCardsDemo() {
  return (
    <div style={{ maxWidth: 960 }}>
      <ProgressSummaryCards report={MOCK_REPORT} />
    </div>
  );
}

export function ProgressTrendsChartDemo() {
  return (
    <div style={{ maxWidth: 840 }}>
      <ProgressTrendsChart report={MOCK_REPORT} />
    </div>
  );
}

export function ProgressCategoryBreakdownDemo() {
  return (
    <div style={{ maxWidth: 840 }}>
      <ProgressCategoryBreakdown report={MOCK_REPORT} />
    </div>
  );
}

export function ProgressComparisonTextDemo() {
  return (
    <div style={{ maxWidth: 840 }}>
      <ProgressComparisonText report={MOCK_REPORT} />
    </div>
  );
}

export function ProgressStatesDemo() {
  return (
    <div style={{ maxWidth: 840, display: "flex", flexDirection: "column", gap: 24 }}>
      <ProgressEmptyState />
      <ProgressErrorState onRetry={() => {}} />
    </div>
  );
}
