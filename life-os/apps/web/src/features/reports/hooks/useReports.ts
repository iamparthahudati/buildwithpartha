import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";
import { fetchReportDefinitions, generateReportData } from "../api/reportsApi";
import type { ReportDefinition, ReportDataResponse, ReportFilterParams } from "../model/reports";

export const REPORTS_QUERY_KEY = ["reports"] as const;

export const reportQueryKeys = {
  all: REPORTS_QUERY_KEY,
  definitions: () => [...REPORTS_QUERY_KEY, "definitions"] as const,
  data: (params: ReportFilterParams) => [...REPORTS_QUERY_KEY, "data", params] as const,
};

export function invalidateReportQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
}

/**
 * Hook to fetch named report definitions catalog from REST API (LOS-1109 / LOS-1110).
 */
export function useReportDefinitions(enabled = true): UseQueryResult<ReportDefinition[], Error> {
  return useQuery({
    queryKey: reportQueryKeys.definitions(),
    queryFn: ({ signal }) => fetchReportDefinitions(signal),
    enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to generate named report data from REST API (LOS-1109 / LOS-1110).
 */
export function useReportData(
  params: ReportFilterParams,
  enabled = true,
): UseQueryResult<ReportDataResponse, Error> {
  return useQuery({
    queryKey: reportQueryKeys.data(params),
    queryFn: ({ signal }) => generateReportData(params, signal),
    enabled: enabled && Boolean(params.reportType),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
