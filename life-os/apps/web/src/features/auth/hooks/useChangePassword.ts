import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import {
  changePassword,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
} from "../api/authApi";

/**
 * useChangePassword (LOS-0516).
 *
 * Changes user password, preserves current session, and revokes all other sessions.
 */
export function useChangePassword(): UseMutationResult<
  ChangePasswordResponse,
  Error,
  ChangePasswordRequest
> {
  return useMutation({
    mutationFn: changePassword,
  });
}
