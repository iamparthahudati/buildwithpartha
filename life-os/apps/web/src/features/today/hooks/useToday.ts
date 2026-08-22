import { useEffect } from "react";

import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { todayLocalDate } from "@lib/localDateTime";

import { getToday, type TodayResponse } from "../api/todayApi";

export const TODAY_QUERY_KEY = ["today"] as const;
const LOCAL_DATE_CHECK_INTERVAL_MS = 30_000;

export function todayQueryKey(timeZone: string) {
  return [...TODAY_QUERY_KEY, timeZone] as const;
}

/** Shared invalidation boundary for later Task, Time Block, Focus, and planning mutations. */
export function invalidateTodayQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: TODAY_QUERY_KEY });
}

/**
 * Loads Today as private server state and refreshes when the account's local date changes.
 * Including the confirmed timezone in the key also makes a preference change select a new
 * date-bound cache entry immediately.
 */
export function useToday(timeZone: string, enabled = true): UseQueryResult<TodayResponse, Error> {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: todayQueryKey(timeZone),
    queryFn: ({ signal }) => getToday(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let knownLocalDate = todayLocalDate(timeZone);
    const intervalId = window.setInterval(() => {
      const currentLocalDate = todayLocalDate(timeZone);
      if (currentLocalDate !== knownLocalDate) {
        knownLocalDate = currentLocalDate;
        void invalidateTodayQueries(queryClient);
      }
    }, LOCAL_DATE_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [enabled, queryClient, timeZone]);

  return query;
}
