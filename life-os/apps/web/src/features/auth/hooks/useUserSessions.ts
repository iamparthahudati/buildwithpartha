import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { listSessions, type SessionListResponse } from "../api/authApi";

export const SESSIONS_QUERY_KEY = ["auth", "sessions"] as const;

/**
 * useUserSessions (LOS-0516).
 *
 * Fetches active sessions for the current authenticated user.
 */
export function useUserSessions(): UseQueryResult<SessionListResponse, Error> {
  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: listSessions,
  });
}
