import { EmptyState, type EmptyStateVariant } from "@components/feedback";

export interface ReportEmptyStateProps {
  readonly variant?: EmptyStateVariant | undefined;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
}

export function ReportEmptyState({
  variant = "filtered",
  title = "No data recorded for this report",
  description = "No activity or metrics were recorded matching the selected report type and filters. Try selecting a broader date range or removing project/category filters.",
}: ReportEmptyStateProps) {
  return (
    <div data-testid="report-empty-state">
      <EmptyState variant={variant} title={title} description={description} titleLevel={3} />
    </div>
  );
}
