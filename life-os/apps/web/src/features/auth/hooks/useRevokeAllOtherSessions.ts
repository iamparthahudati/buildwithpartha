import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { revokeAllOtherSessions, type RevokeAllOtherSessionsResponse } from "../api/authApi";
import { SESSIONS_QUERY_KEY } from "./useUserSessions";

/**
 * useRevokeAllOtherSessions (LOS-0516).
 *
 * Revokes all other active sessions while preserving current device session.
 */
export function useRevokeAllOtherSessions(): UseMutationResult<
  RevokeAllOtherSessionsResponse,
  Error,
  void
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeAllOtherSessions,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}
