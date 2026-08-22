import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getPreferences, type UserPreferencesResponse } from "../api/userProfileApi";

export const USER_PREFERENCES_QUERY_KEY = ["user", "preferences"] as const;

/**
 * Hook to retrieve current user's planning defaults and preferences.
 */
export function useUserPreferences(): UseQueryResult<UserPreferencesResponse, Error> {
  return useQuery({
    queryKey: USER_PREFERENCES_QUERY_KEY,
    queryFn: getPreferences,
  });
}
