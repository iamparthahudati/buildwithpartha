import { Download } from "lucide-react";
import { PageHeader } from "@components/navigation";
import { Button, Badge, Select } from "@components/ui";
import { Alert } from "@components/feedback";
import { PeriodControls } from "./PeriodControls";
import { ProgressSummaryCards } from "./ProgressSummaryCards";
import { ProgressTrendsChart } from "./ProgressTrendsChart";
import { ProgressCategoryBreakdown } from "./ProgressCategoryBreakdown";
import { ProgressComparisonText } from "./ProgressComparisonText";
import { ProgressEmptyState } from "./ProgressEmptyState";
import { ProgressErrorState } from "./ProgressErrorState";
import type { ProgressReport, ProgressFilterParams } from "../model/progress";
import "./progress-screen.css";

export interface ProgressScreenProps {
  readonly report?: ProgressReport | null | undefined;
  readonly filter: ProgressFilterParams;
  readonly onFilterChange: (next: ProgressFilterParams) => void;
  readonly loading?: boolean | undefined;
  readonly error?: string | null | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly projects?: readonly { readonly id: string; readonly name: string }[] | undefined;
  readonly onExportClick?: (() => void) | undefined;
}

function checkRangeExceeded(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  return diffDays > 366;
}

function isReportEmpty(report: ProgressReport): boolean {
  return (
    report.taskProgress.totalCount === 0 &&
    report.focusProgress.actualFocusMinutes === 0 &&
    report.projectProgress.totalCount === 0 &&
    report.goalProgress.totalCount === 0 &&
    report.habitProgress.totalCount === 0 &&
    report.reviewProgress.finalizedReviewsCount === 0
  );
}

export function ProgressScreen({
  report,
  filter,
  onFilterChange,
  loading = false,
  error = null,
  onRetry,
  projects = [],
  onExportClick,
}: ProgressScreenProps) {
  const rangeExceeded = checkRangeExceeded(filter.startDate, filter.endDate);

  const projectOptions = [
    { value: "", label: "All Projects" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const handleProjectSelect = (projectId: string) => {
    const next: ProgressFilterParams = {
      ...filter,
      projectId: projectId || undefined,
    };
    onFilterChange(next);
  };

  return (
    <div className="progress-screen">
      <PageHeader
        title="Progress & Insights"
        description="Aggregated performance metrics across tasks, focus time, projects, goals, habits, and reviews."
        primaryAction={
          onExportClick ? (
            <Button variant="secondary" size="sm" iconStart={Download} onClick={onExportClick}>
              Export Report
            </Button>
          ) : undefined
        }
        metadata={
          report?.metricDictionaryVersion ? (
            <Badge tone="info">Metric Dict v{report.metricDictionaryVersion}</Badge>
          ) : undefined
        }
      />

      <div className="progress-screen__filters-row">
        <div className="progress-screen__filters-main">
          <PeriodControls value={filter} onChange={onFilterChange} loading={loading} />
        </div>

        {projects.length > 0 && (
          <div className="progress-screen__extra-filters">
            <Select
              label="Filter by Project"
              value={filter.projectId ?? ""}
              options={projectOptions}
              onChange={(e) => handleProjectSelect(e.target.value)}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {rangeExceeded && (
        <Alert tone="warning" heading="Date Range Exceeds 1 Year">
          Selected period exceeds the maximum 366-day performance boundary. Please select a shorter
          date range.
        </Alert>
      )}

      {error ? (
        <ProgressErrorState description={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="progress-screen__skeleton" data-testid="progress-skeleton">
          <div className="progress-screen__skeleton-box" />
          <div className="progress-screen__skeleton-box" />
        </div>
      ) : report ? (
        isReportEmpty(report) ? (
          <ProgressEmptyState />
        ) : (
          <>
            <ProgressSummaryCards report={report} loading={false} />

            <ProgressComparisonText report={report} />

            <div className="progress-screen__charts-grid">
              <ProgressTrendsChart report={report} />
              <ProgressCategoryBreakdown report={report} />
            </div>
          </>
        )
      ) : null}
    </div>
  );
}
