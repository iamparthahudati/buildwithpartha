import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import {
  updatePlanningDefaultsStep,
  type OnboardingResponse,
  type UpdatePlanningDefaultsStepRequest,
} from "../api/onboardingApi";
import { ONBOARDING_QUERY_KEY } from "./useOnboarding";

/**
 * useUpdatePlanningDefaultsStep (LOS-0514).
 * Saves optional working schedule, focus durations, or records an explicit step skip.
 */
export function useUpdatePlanningDefaultsStep(): UseMutationResult<
  OnboardingResponse,
  Error,
  UpdatePlanningDefaultsStepRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePlanningDefaultsStep,
    onSuccess: (data) => {
      queryClient.setQueryData(ONBOARDING_QUERY_KEY, data);
    },
  });
}
