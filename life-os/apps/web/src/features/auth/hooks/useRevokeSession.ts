import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { revokeSession, type RevokeSessionResponse } from "../api/authApi";
import { SESSIONS_QUERY_KEY } from "./useUserSessions";

/**
 * useRevokeSession (LOS-0516).
 *
 * Revokes an individual session and refreshes active session list.
 */
export function useRevokeSession(): UseMutationResult<RevokeSessionResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}
