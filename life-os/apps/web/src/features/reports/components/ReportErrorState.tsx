import { Alert } from "@components/feedback";
import { Button } from "@components/ui";

export interface ReportErrorStateProps {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly onRetry?: (() => void) | undefined;
}

export function ReportErrorState({
  title = "Failed to load report",
  description = "An error occurred while generating report data. Please verify your connection or filter parameters.",
  onRetry,
}: ReportErrorStateProps) {
  return (
    <div data-testid="report-error-state">
      <Alert tone="danger" heading={title}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>{description}</div>
          {onRetry && (
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
                Retry Loading
              </Button>
            </div>
          )}
        </div>
      </Alert>
    </div>
  );
}
