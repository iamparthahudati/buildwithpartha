import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { deleteAccountApi } from "../api/privacyApi";
import type { AccountDeletionRequest, AccountDeletionResponse } from "../model/privacy";

export function useAccountDeletion(): UseMutationResult<
  AccountDeletionResponse,
  Error,
  AccountDeletionRequest
> {
  return useMutation({
    mutationFn: deleteAccountApi,
  });
}
