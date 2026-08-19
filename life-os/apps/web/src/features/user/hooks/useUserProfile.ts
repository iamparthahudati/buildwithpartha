import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getProfile, type UserProfileResponse } from "../api/userProfileApi";

export const USER_PROFILE_QUERY_KEY = ["user", "profile"] as const;

/**
 * Hook to retrieve current user's profile and localization settings.
 */
export function useUserProfile(): UseQueryResult<UserProfileResponse, Error> {
  return useQuery({
    queryKey: USER_PROFILE_QUERY_KEY,
    queryFn: getProfile,
  });
}
