import { apiRequest } from "@lib/apiClient";
import type { NamedReportType } from "../model/reports";

/** Response from POST /reports/export/csv (LOS-1111). */
export interface CsvExportResponse {
  readonly exportId: string;
  readonly fileName: string;
  readonly downloadToken: string;
  readonly tokenTtlMinutes: number;
  readonly reportType: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly timeZone: string;
}

/** Parameters for requesting a CSV export (LOS-1111). */
export interface CsvExportParams {
  readonly reportType: NamedReportType;
  readonly startDate?: string | undefined;
  readonly endDate?: string | undefined;
  readonly timeZone: string;
  readonly projectId?: string | undefined;
  readonly labelId?: string | undefined;
  readonly category?: string | undefined;
}

/**
 * Requests a CSV export for the given report type and filters.
 * Returns a CsvExportResponse containing a short-lived (15-minute) download token.
 */
export async function requestCsvExport(params: CsvExportParams): Promise<CsvExportResponse> {
  const query = new URLSearchParams();
  query.set("reportType", params.reportType);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.timeZone) query.set("timeZone", params.timeZone);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.labelId) query.set("labelId", params.labelId);
  if (params.category) query.set("category", params.category);

  const queryString = query.toString();
  const path = `/reports/export/csv${queryString ? `?${queryString}` : ""}`;
  return apiRequest<CsvExportResponse>(path, { method: "POST" });
}

/**
 * Builds the authenticated download URL for a CSV export token.
 * The URL includes the token as a query parameter for browser-native download.
 * The browser session cookie is sent automatically since this is a same-origin GET.
 */
export function buildCsvDownloadUrl(token: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/life-os/api/v1";
  return `${base}/reports/export/csv/download?token=${encodeURIComponent(token)}`;
}
