import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { cancelAccountDeletionApi } from "../api/privacyApi";
import type { CancelAccountDeletionRequest, CancelAccountDeletionResponse } from "../model/privacy";

export function useCancelAccountDeletion(): UseMutationResult<
  CancelAccountDeletionResponse,
  Error,
  CancelAccountDeletionRequest
> {
  return useMutation({
    mutationFn: cancelAccountDeletionApi,
  });
}
