import { Download } from "lucide-react";
import { Button } from "@components/ui";
import { useExportCsv } from "../hooks/useExportCsv";
import type { ReportFilterParams } from "../model/reports";

export interface ReportExportButtonProps {
  /** Current report filter used to generate the CSV. */
  readonly filter: ReportFilterParams;
  /** Whether the parent report is still loading — disables the button. */
  readonly reportLoading?: boolean | undefined;
  /** Whether a report result is available — disables export when absent. */
  readonly reportAvailable?: boolean | undefined;
}

/**
 * Export CSV button for the Reports screen (LOS-1111).
 *
 * Calls POST /reports/export/csv with the current filter parameters and
 * triggers a browser file download via the private short-lived download token
 * returned by the server. Ranges >90 days are rejected server-side (async
 * threshold) with a clear error message.
 *
 * States:
 * - Default: enabled when a report is loaded and not in async range.
 * - Pending: "Exporting…" with spinner, button disabled.
 * - Error: error toast-style text below the button.
 * - Success: browser download triggered automatically; button resets.
 */
export function ReportExportButton({
  filter,
  reportLoading = false,
  reportAvailable = false,
}: ReportExportButtonProps) {
  const { mutate: exportCsv, isPending, isError, error, reset } = useExportCsv();

  const isDisabled = reportLoading || !reportAvailable || isPending;

  const handleExport = () => {
    if (isDisabled) return;
    reset();
    exportCsv({
      reportType: filter.reportType,
      startDate: filter.startDate,
      endDate: filter.endDate,
      timeZone: filter.timeZone,
      projectId: filter.projectId,
      labelId: filter.labelId,
      category: filter.category,
    });
  };

  const errorMessage = isError
    ? (error?.message ?? "CSV export failed. Please try a shorter date range.")
    : null;

  return (
    <div className="report-export-button" data-testid="report-export-button">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        iconStart={Download}
        onClick={handleExport}
        disabled={isDisabled}
        loading={isPending}
        loadingLabel="Exporting report CSV"
      >
        Export CSV
      </Button>

      {errorMessage && (
        <p
          className="report-export-button__error"
          role="alert"
          aria-live="polite"
          data-testid="report-export-error"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
