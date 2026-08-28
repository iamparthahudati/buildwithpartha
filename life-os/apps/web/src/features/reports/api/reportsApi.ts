import { apiRequest } from "@lib/apiClient";
import type {
  ReportDefinition,
  ReportDataResponse,
  ReportFilterParams,
  NamedReportType,
} from "../model/reports";

/**
 * Fetches all available named report definition catalog metadata (LOS-1109 / LOS-1110).
 */
export async function fetchReportDefinitions(signal?: AbortSignal): Promise<ReportDefinition[]> {
  return apiRequest<ReportDefinition[]>("/reports/definitions", signal ? { signal } : {});
}

/**
 * Fetches single named report definition metadata (LOS-1109 / LOS-1110).
 */
export async function fetchReportDefinition(
  reportType: NamedReportType,
  signal?: AbortSignal,
): Promise<ReportDefinition> {
  return apiRequest<ReportDefinition>(
    `/reports/definitions/${encodeURIComponent(reportType)}`,
    signal ? { signal } : {},
  );
}

/**
 * Generates report data payload for specified report type and query filters (LOS-1109 / LOS-1110).
 */
export async function generateReportData(
  params: ReportFilterParams,
  signal?: AbortSignal,
): Promise<ReportDataResponse> {
  const query = new URLSearchParams();
  query.set("reportType", params.reportType);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.timeZone) query.set("timeZone", params.timeZone);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.labelId) query.set("labelId", params.labelId);
  if (params.category) query.set("category", params.category);

  const queryString = query.toString();
  const path = `/reports/generate${queryString ? `?${queryString}` : ""}`;
  return apiRequest<ReportDataResponse>(path, signal ? { signal } : {});
}
