import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportsScreen } from "../components/ReportsScreen";
import type { ReportDataResponse, ReportFilterParams } from "../model/reports";

const MOCK_REPORT_DATA: ReportDataResponse = {
  reportType: "TASK_COMPLETION",
  reportName: "Task Completion Report",
  description: "Task completion metrics and throughput.",
  metricDictionaryVersion: "1.0.0",
  generatedAt: "2026-08-27T00:00:00Z",
  timeZone: "Asia/Kolkata",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  isAsynchronous: false,
  asyncThresholdDays: 90,
  status: "COMPLETED",
  summaryText: "During this period, 42 tasks were completed with steady throughput.",
  metrics: [
    {
      key: "completed_count",
      name: "Total Tasks Completed",
      value: "42",
      numericValue: 42,
      unit: "tasks",
      comparisonValue: "+10%",
      status: "SUCCESS",
    },
  ],
  tables: [
    {
      tableId: "task_table",
      title: "Task Breakdown Table",
      description: "Priority breakdown.",
      headers: ["Priority", "Count"],
      rows: [["HIGH", 12]],
      totalRows: 1,
    },
  ],
  chartSeries: [
    {
      chartId: "throughput_chart",
      title: "Weekly Throughput",
      chartType: "BAR",
      xAxisLabel: "Week",
      yAxisLabel: "Tasks",
      dataPoints: [{ label: "Week 1", value: 10, category: "Tasks", date: "2026-08-07" }],
    },
  ],
};

const DEFAULT_FILTER: ReportFilterParams = {
  reportType: "TASK_COMPLETION",
  periodPreset: "THIS_MONTH",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  timeZone: "Asia/Kolkata",
};

describe("ReportsScreen", () => {
  it("renders page header, selector, filters, summary metrics, charts, and tables", () => {
    render(
      <ReportsScreen report={MOCK_REPORT_DATA} filter={DEFAULT_FILTER} onFilterChange={vi.fn()} />,
    );

    expect(screen.getByText("Reports & Analytics")).toBeInTheDocument();
    expect(screen.getByTestId("report-selector")).toBeInTheDocument();
    expect(screen.getByTestId("report-filter-bar")).toBeInTheDocument();
    expect(screen.getByTestId("report-summary-metrics")).toBeInTheDocument();
    expect(screen.getByTestId("report-chart")).toBeInTheDocument();
    expect(screen.getByTestId("report-data-table")).toBeInTheDocument();
    expect(screen.getByText("Accessible Narrative Summary")).toBeInTheDocument();
    expect(
      screen.getByText("During this period, 42 tasks were completed with steady throughput."),
    ).toBeInTheDocument();
  });

  it("renders empty state when report has no data", () => {
    const emptyReport: ReportDataResponse = {
      ...MOCK_REPORT_DATA,
      metrics: [],
      tables: [],
      chartSeries: [],
    };

    render(<ReportsScreen report={emptyReport} filter={DEFAULT_FILTER} onFilterChange={vi.fn()} />);

    expect(screen.getByTestId("report-empty-state")).toBeInTheDocument();
  });

  it("renders error state and triggers onRetry when provided", () => {
    const handleRetry = vi.fn();
    render(
      <ReportsScreen
        filter={DEFAULT_FILTER}
        onFilterChange={vi.fn()}
        error="Failed to connect to report server."
        onRetry={handleRetry}
      />,
    );

    expect(screen.getByTestId("report-error-state")).toBeInTheDocument();
    expect(screen.getByText("Failed to connect to report server.")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry loading/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it("renders asynchronous notice when report is asynchronous", () => {
    const asyncReport: ReportDataResponse = {
      ...MOCK_REPORT_DATA,
      isAsynchronous: true,
      jobId: "job-123",
      status: "QUEUED",
    };

    render(<ReportsScreen report={asyncReport} filter={DEFAULT_FILTER} onFilterChange={vi.fn()} />);

    expect(screen.getByTestId("report-async-notice")).toBeInTheDocument();
    expect(screen.getByText("job-123")).toBeInTheDocument();
  });

  it("triggers window.print when Print button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <ReportsScreen report={MOCK_REPORT_DATA} filter={DEFAULT_FILTER} onFilterChange={vi.fn()} />,
    );

    const printBtn = screen.getByRole("button", { name: /print \/ save pdf/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalledOnce();

    printSpy.mockRestore();
  });

  it("triggers onSaveRecentSettings and onRestoreRecentSettings", () => {
    const handleSave = vi.fn();
    const handleRestore = vi.fn();

    render(
      <ReportsScreen
        report={MOCK_REPORT_DATA}
        filter={DEFAULT_FILTER}
        onFilterChange={vi.fn()}
        onSaveRecentSettings={handleSave}
        onRestoreRecentSettings={handleRestore}
        hasSavedSettings={true}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: /save recent settings/i });
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledOnce();

    const restoreBtn = screen.getByRole("button", { name: /restore saved settings/i });
    fireEvent.click(restoreBtn);
    expect(handleRestore).toHaveBeenCalledOnce();
  });

  it("shows warning when date range exceeds 366 days", () => {
    const largeRangeFilter: ReportFilterParams = {
      ...DEFAULT_FILTER,
      startDate: "2025-01-01",
      endDate: "2026-08-31", // > 366 days
    };

    render(
      <ReportsScreen
        report={MOCK_REPORT_DATA}
        filter={largeRangeFilter}
        onFilterChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Date Range Exceeds Maximum Boundary (366 Days)")).toBeInTheDocument();
  });
});
