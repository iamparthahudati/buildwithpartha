import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useAuthSession } from "@state/authSession";

import {
  updateProfile,
  type UpdateUserProfileRequest,
  type UserProfileResponse,
} from "../api/userProfileApi";
import { USER_PROFILE_QUERY_KEY } from "./useUserProfile";

/**
 * Hook to update user profile (display name, timezone, locale, week start).
 * Updates query cache and synchronizes AuthSessionProvider.
 */
export function useUpdateUserProfile(): UseMutationResult<
  UserProfileResponse,
  Error,
  UpdateUserProfileRequest
> {
  const queryClient = useQueryClient();
  const { user, csrfToken, setSession } = useAuthSession();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(USER_PROFILE_QUERY_KEY, data);
      if (user && csrfToken) {
        setSession(
          {
            ...user,
            displayName: data.displayName,
            timeZone: data.timeZone,
            locale: data.locale,
            weekStart: data.weekStart,
          },
          csrfToken,
        );
      }
    },
  });
}
