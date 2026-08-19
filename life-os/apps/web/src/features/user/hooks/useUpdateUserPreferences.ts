import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import {
  updatePreferences,
  type UpdateUserPreferencesRequest,
  type UserPreferencesResponse,
} from "../api/userProfileApi";
import { USER_PREFERENCES_QUERY_KEY } from "./useUserPreferences";

/**
 * Hook to update user's planning defaults and preferences.
 */
export function useUpdateUserPreferences(): UseMutationResult<
  UserPreferencesResponse,
  Error,
  UpdateUserPreferencesRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(USER_PREFERENCES_QUERY_KEY, data);
    },
  });
}
