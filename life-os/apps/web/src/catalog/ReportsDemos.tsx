import { useState } from "react";
import {
  ReportSelector,
  ReportFilterBar,
  ReportSummaryMetrics,
  ReportChart,
  ReportDataTable,
  ReportAsynchronousNotice,
  ReportEmptyState,
  ReportErrorState,
  ReportsScreen,
  type ReportDataResponse,
  type ReportFilterParams,
  type NamedReportType,
} from "@features/reports";

const MOCK_REPORT_DATA: ReportDataResponse = {
  reportType: "TASK_COMPLETION",
  reportName: "Task Completion & Throughput Report",
  description: "Task completion counts, velocity trends, priority breakdown, and overdue rates.",
  metricDictionaryVersion: "1.0.0",
  generatedAt: "2026-08-27T00:00:00Z",
  timeZone: "Asia/Kolkata",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  isAsynchronous: false,
  asyncThresholdDays: 90,
  status: "COMPLETED",
  summaryText:
    "During this period, 42 tasks were completed with an average throughput of 10.5 tasks per week.",
  metrics: [
    {
      key: "total_completed",
      name: "Total Tasks Completed",
      value: "42",
      numericValue: 42,
      unit: "tasks",
      comparisonValue: "+15% vs previous period",
      status: "SUCCESS",
    },
    {
      key: "completion_rate",
      name: "Completion Rate",
      value: "84.0%",
      numericValue: 84.0,
      unit: null,
      comparisonValue: "+5% vs target",
      status: "SUCCESS",
    },
    {
      key: "overdue_rate",
      name: "Overdue Rate",
      value: "4.8%",
      numericValue: 4.8,
      unit: null,
      comparisonValue: "-2% vs target",
      status: "SUCCESS",
    },
    {
      key: "high_priority_completed",
      name: "High Priority Completed",
      value: "12",
      numericValue: 12,
      unit: "tasks",
      comparisonValue: "100% of high priority",
      status: "SUCCESS",
    },
  ],
  tables: [
    {
      tableId: "task_breakdown_table",
      title: "Task Breakdown by Priority and Status",
      description: "Distribution of tasks across priority tiers and current status.",
      headers: ["Priority", "Total Tasks", "Completed", "In Progress", "Overdue"],
      rows: [
        ["HIGH", 12, 12, 0, 0],
        ["MEDIUM", 20, 18, 2, 0],
        ["LOW", 18, 12, 4, 2],
      ],
      totalRows: 3,
    },
  ],
  chartSeries: [
    {
      chartId: "weekly_throughput_chart",
      title: "Weekly Task Completion Throughput",
      chartType: "BAR",
      xAxisLabel: "Week",
      yAxisLabel: "Tasks Completed",
      dataPoints: [
        { label: "Week 1", value: 10, category: "Tasks", date: "2026-08-07" },
        { label: "Week 2", value: 12, category: "Tasks", date: "2026-08-14" },
        { label: "Week 3", value: 8, category: "Tasks", date: "2026-08-21" },
        { label: "Week 4", value: 12, category: "Tasks", date: "2026-08-28" },
      ],
    },
  ],
};

export function ReportSelectorDemo() {
  const [type, setType] = useState<NamedReportType>("TASK_COMPLETION");
  return (
    <div style={{ maxWidth: 840 }}>
      <ReportSelector selectedReportType={type} onSelectReportType={setType} />
    </div>
  );
}

export function ReportFilterBarDemo() {
  const [filter, setFilter] = useState<ReportFilterParams>({
    reportType: "TASK_COMPLETION",
    periodPreset: "THIS_MONTH",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    timeZone: "Asia/Kolkata",
  });
  return (
    <div style={{ maxWidth: 840 }}>
      <ReportFilterBar value={filter} onChange={setFilter} />
    </div>
  );
}

export function ReportSummaryMetricsDemo() {
  return (
    <div style={{ maxWidth: 960 }}>
      <ReportSummaryMetrics metrics={MOCK_REPORT_DATA.metrics} />
    </div>
  );
}

export function ReportChartDemo() {
  return (
    <div style={{ maxWidth: 840 }}>
      <ReportChart chartSeries={MOCK_REPORT_DATA.chartSeries} />
    </div>
  );
}

export function ReportDataTableDemo() {
  return (
    <div style={{ maxWidth: 840 }}>
      <ReportDataTable tables={MOCK_REPORT_DATA.tables} />
    </div>
  );
}

export function ReportAsynchronousNoticeDemo() {
  return (
    <div style={{ maxWidth: 840 }}>
      <ReportAsynchronousNotice
        isAsynchronous={true}
        asyncThresholdDays={90}
        jobId="job-rpt-20260827-001"
        status="QUEUED"
      />
    </div>
  );
}

export function ReportStatesDemo() {
  return (
    <div style={{ maxWidth: 840, display: "flex", flexDirection: "column", gap: 24 }}>
      <ReportEmptyState />
      <ReportErrorState onRetry={() => {}} />
    </div>
  );
}

export function ReportsScreenDemo() {
  const [filter, setFilter] = useState<ReportFilterParams>({
    reportType: "TASK_COMPLETION",
    periodPreset: "THIS_MONTH",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div style={{ width: "100%" }}>
      <ReportsScreen
        report={MOCK_REPORT_DATA}
        filter={filter}
        onFilterChange={setFilter}
        projects={[{ id: "p-1", name: "LifeOS Engine" }]}
        onSaveRecentSettings={() => {}}
        onRestoreRecentSettings={() => {}}
        hasSavedSettings={true}
      />
    </div>
  );
}
