import { Alert } from "@components/feedback";
import { Badge } from "@components/ui";

export interface ReportAsynchronousNoticeProps {
  readonly isAsynchronous: boolean;
  readonly asyncThresholdDays: number;
  readonly jobId?: string | null | undefined;
  readonly status: string;
}

export function ReportAsynchronousNotice({
  isAsynchronous,
  asyncThresholdDays,
  jobId,
  status,
}: ReportAsynchronousNoticeProps) {
  if (!isAsynchronous && status !== "QUEUED") {
    return null;
  }

  return (
    <div data-testid="report-async-notice">
      <Alert tone="info" heading="Large Report Asynchronous Processing Queued">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            The requested date range exceeds the synchronous threshold ({asyncThresholdDays} days).
            Your report calculation has been queued for background processing.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>
              Status: <Badge tone="info">{status}</Badge>
            </span>
            {jobId && (
              <span>
                Job ID: <code>{jobId}</code>
              </span>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
}
