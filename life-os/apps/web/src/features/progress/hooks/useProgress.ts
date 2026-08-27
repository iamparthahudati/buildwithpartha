import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";
import { fetchProgressReport } from "../api/progressApi";
import type { ProgressReport, ProgressFilterParams } from "../model/progress";

export const PROGRESS_QUERY_KEY = ["progress"] as const;

export const progressQueryKeys = {
  all: PROGRESS_QUERY_KEY,
  report: (params: ProgressFilterParams) => [...PROGRESS_QUERY_KEY, "report", params] as const,
};

export function invalidateProgressQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY });
}

/**
 * Hook to query progress report aggregation from backend REST API (LOS-1108 / LOS-1106).
 */
export function useProgressReport(
  params: ProgressFilterParams,
  enabled = true,
): UseQueryResult<ProgressReport, Error> {
  return useQuery({
    queryKey: progressQueryKeys.report(params),
    queryFn: ({ signal }) => fetchProgressReport(params, signal),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
