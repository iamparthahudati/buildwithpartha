import { apiRequest } from "@lib/apiClient";
import type { ProgressReport, ProgressFilterParams } from "../model/progress";

/**
 * Fetches progress aggregation report from REST API GET /reports/progress (LOS-1108 / LOS-1106).
 */
export async function fetchProgressReport(
  params: ProgressFilterParams,
  signal?: AbortSignal,
): Promise<ProgressReport> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.timeZone) query.set("timeZone", params.timeZone);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.labelId) query.set("labelId", params.labelId);
  if (params.category) query.set("category", params.category);

  const queryString = query.toString();
  const path = `/reports/progress${queryString ? `?${queryString}` : ""}`;
  return apiRequest<ProgressReport>(path, signal ? { signal } : {});
}
