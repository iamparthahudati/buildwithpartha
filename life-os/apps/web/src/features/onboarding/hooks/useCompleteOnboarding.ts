import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { completeOnboarding, type OnboardingResponse } from "../api/onboardingApi";
import { ONBOARDING_QUERY_KEY } from "./useOnboarding";

/**
 * useCompleteOnboarding (LOS-0514).
 * Marks onboarding as COMPLETED and records completion timestamp.
 */
export function useCompleteOnboarding(): UseMutationResult<OnboardingResponse, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (data) => {
      queryClient.setQueryData(ONBOARDING_QUERY_KEY, data);
    },
  });
}
