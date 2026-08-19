import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useAuthSession } from "@state/authSession";

import {
  updateWelcomeStep,
  type OnboardingResponse,
  type UpdateWelcomeStepRequest,
} from "../api/onboardingApi";
import { ONBOARDING_QUERY_KEY } from "./useOnboarding";

/**
 * useUpdateWelcomeStep (LOS-0514).
 * Saves confirmed display name and marks WELCOME step completed.
 */
export function useUpdateWelcomeStep(): UseMutationResult<
  OnboardingResponse,
  Error,
  UpdateWelcomeStepRequest
> {
  const queryClient = useQueryClient();
  const { user, csrfToken, setSession } = useAuthSession();

  return useMutation({
    mutationFn: updateWelcomeStep,
    onSuccess: (data) => {
      queryClient.setQueryData(ONBOARDING_QUERY_KEY, data);
      if (user && csrfToken) {
        setSession(
          {
            ...user,
            displayName: data.profile.displayName,
          },
          csrfToken,
        );
      }
    },
  });
}
