import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getOnboarding, type OnboardingResponse } from "../api/onboardingApi";

export const ONBOARDING_QUERY_KEY = ["onboarding"] as const;

/**
 * useOnboarding (LOS-0514).
 * Fetches the authenticated user's onboarding state and preference configuration.
 */
export function useOnboarding(): UseQueryResult<OnboardingResponse, Error> {
  return useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: getOnboarding,
  });
}
