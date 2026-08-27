import { Printer, Bookmark, RotateCcw } from "lucide-react";
import { PageHeader } from "@components/navigation";
import { Button, Badge } from "@components/ui";
import { Alert } from "@components/feedback";

import { ReportSelector } from "./ReportSelector";
import { ReportFilterBar } from "./ReportFilterBar";
import { ReportSummaryMetrics } from "./ReportSummaryMetrics";
import { ReportChart } from "./ReportChart";
import { ReportDataTable } from "./ReportDataTable";
import { ReportAsynchronousNotice } from "./ReportAsynchronousNotice";
import { ReportEmptyState } from "./ReportEmptyState";
import { ReportErrorState } from "./ReportErrorState";

import type {
  ReportDataResponse,
  ReportDefinition,
  ReportFilterParams,
  NamedReportType,
} from "../model/reports";
import "./reports-screen.css";

export interface ReportsScreenProps {
  readonly report?: ReportDataResponse | null | undefined;
  readonly definitions?: readonly ReportDefinition[] | undefined;
  readonly filter: ReportFilterParams;
  readonly onFilterChange: (next: ReportFilterParams) => void;
  readonly loading?: boolean | undefined;
  readonly error?: string | null | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly projects?: readonly { readonly id: string; readonly name: string }[] | undefined;
  readonly onSaveRecentSettings?: (() => void) | undefined;
  readonly onRestoreRecentSettings?: (() => void) | undefined;
  readonly hasSavedSettings?: boolean | undefined;
}

function checkRangeExceeded(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  return diffDays > 366;
}

function isReportEmpty(report: ReportDataResponse): boolean {
  const noMetrics = !report.metrics || report.metrics.length === 0;
  const noTables = !report.tables || report.tables.every((t) => !t.rows || t.rows.length === 0);
  const noCharts =
    !report.chartSeries ||
    report.chartSeries.every((c) => !c.dataPoints || c.dataPoints.length === 0);
  return noMetrics && noTables && noCharts;
}

export function ReportsScreen({
  report,
  definitions = [],
  filter,
  onFilterChange,
  loading = false,
  error = null,
  onRetry,
  projects = [],
  onSaveRecentSettings,
  onRestoreRecentSettings,
  hasSavedSettings = false,
}: ReportsScreenProps) {
  const rangeExceeded = checkRangeExceeded(filter.startDate, filter.endDate);

  const selectedDef = definitions.find((d) => d.reportType === filter.reportType);
  const supportedFilters = selectedDef?.supportedFilters ?? [];

  const handleReportTypeSelect = (reportType: NamedReportType) => {
    onFilterChange({
      ...filter,
      reportType,
    });
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="reports-screen" data-testid="reports-screen">
      <div className="reports-screen__header-area">
        <PageHeader
          title="Reports & Analytics"
          description="Configurable named analytics reports with metric breakdown, charts, tabular data, and export support."
          primaryAction={
            <Button
              variant="secondary"
              size="sm"
              iconStart={Printer}
              onClick={handlePrint}
              disabled={loading || !report}
            >
              Print / Save PDF
            </Button>
          }
          metadata={
            report?.metricDictionaryVersion ? (
              <Badge tone="info">Metric Dict v{report.metricDictionaryVersion}</Badge>
            ) : undefined
          }
        />
      </div>

      <div className="reports-screen__controls-area">
        <div className="reports-screen__top-actions">
          {onSaveRecentSettings && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconStart={Bookmark}
              onClick={onSaveRecentSettings}
            >
              Save Recent Settings
            </Button>
          )}

          {hasSavedSettings && onRestoreRecentSettings && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconStart={RotateCcw}
              onClick={onRestoreRecentSettings}
            >
              Restore Saved Settings
            </Button>
          )}
        </div>

        <ReportSelector
          selectedReportType={filter.reportType}
          onSelectReportType={handleReportTypeSelect}
          definitions={definitions}
          loading={loading}
        />

        <ReportFilterBar
          value={filter}
          onChange={onFilterChange}
          projects={projects}
          supportedFilters={supportedFilters}
          loading={loading}
        />
      </div>

      {rangeExceeded && (
        <Alert tone="warning" heading="Date Range Exceeds Maximum Boundary (366 Days)">
          The selected report timeframe exceeds the maximum 1-year (366 days) boundary. Please
          select a shorter date range for optimal report generation.
        </Alert>
      )}

      {error ? (
        <ReportErrorState description={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="reports-screen__skeleton" data-testid="reports-skeleton">
          <div className="reports-screen__skeleton-box" />
          <div className="reports-screen__skeleton-box" />
          <div className="reports-screen__skeleton-box" />
        </div>
      ) : report ? (
        <div className="reports-screen__content">
          <ReportAsynchronousNotice
            isAsynchronous={report.isAsynchronous}
            asyncThresholdDays={report.asyncThresholdDays}
            jobId={report.jobId}
            status={report.status}
          />

          {isReportEmpty(report) ? (
            <ReportEmptyState />
          ) : (
            <>
              {report.summaryText && (
                <div className="reports-screen__summary-box" data-testid="report-summary-text">
                  <h3 className="reports-screen__summary-heading">Accessible Narrative Summary</h3>
                  <p className="reports-screen__summary-text">{report.summaryText}</p>
                </div>
              )}

              {report.metrics && report.metrics.length > 0 && (
                <div className="reports-screen__section">
                  <h3 className="reports-screen__section-title">Key Summary Metrics</h3>
                  <ReportSummaryMetrics metrics={report.metrics} />
                </div>
              )}

              {report.chartSeries && report.chartSeries.length > 0 && (
                <div className="reports-screen__section">
                  <h3 className="reports-screen__section-title">Visual Trends & Breakdown</h3>
                  <ReportChart chartSeries={report.chartSeries} />
                </div>
              )}

              {report.tables && report.tables.length > 0 && (
                <div className="reports-screen__section">
                  <h3 className="reports-screen__section-title">Tabular Data Breakdowns</h3>
                  <ReportDataTable tables={report.tables} />
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
