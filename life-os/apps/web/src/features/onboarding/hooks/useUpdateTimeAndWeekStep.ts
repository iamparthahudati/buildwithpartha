import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useAuthSession } from "@state/authSession";

import {
  updateTimeAndWeekStep,
  type OnboardingResponse,
  type UpdateTimeAndWeekStepRequest,
} from "../api/onboardingApi";
import { ONBOARDING_QUERY_KEY } from "./useOnboarding";

/**
 * useUpdateTimeAndWeekStep (LOS-0514).
 * Saves confirmed timezone, locale, and week start settings.
 */
export function useUpdateTimeAndWeekStep(): UseMutationResult<
  OnboardingResponse,
  Error,
  UpdateTimeAndWeekStepRequest
> {
  const queryClient = useQueryClient();
  const { user, csrfToken, setSession } = useAuthSession();

  return useMutation({
    mutationFn: updateTimeAndWeekStep,
    onSuccess: (data) => {
      queryClient.setQueryData(ONBOARDING_QUERY_KEY, data);
      if (user && csrfToken) {
        setSession(
          {
            ...user,
            timeZone: data.profile.timeZone,
            locale: data.profile.locale,
            weekStart: data.profile.weekStart,
          },
          csrfToken,
        );
      }
    },
  });
}
