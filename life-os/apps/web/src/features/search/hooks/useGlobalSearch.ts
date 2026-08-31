import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";
import { searchGlobal } from "../api/searchApi";
import type { SearchQueryParams, SearchResponse } from "../model/search";

export const SEARCH_QUERY_KEY = ["search"] as const;

export const searchQueryKeys = {
  all: SEARCH_QUERY_KEY,
  query: (params: SearchQueryParams) => [...SEARCH_QUERY_KEY, params] as const,
};

export function invalidateSearchQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: SEARCH_QUERY_KEY });
}

/**
 * Hook to query user-scoped global search results from backend REST API (LOS-1302).
 */
export function useGlobalSearch(
  params: SearchQueryParams,
  enabled = true,
): UseQueryResult<SearchResponse, Error> {
  const queryText = params.q?.trim() ?? "";
  const isEnabled = enabled && (queryText !== "" || Boolean(params.type) || Boolean(params.types));

  return useQuery({
    queryKey: searchQueryKeys.query(params),
    queryFn: ({ signal }) => searchGlobal(params, signal),
    enabled: isEnabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
