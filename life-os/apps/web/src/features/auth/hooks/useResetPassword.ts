import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import {
  resetPassword,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
} from "../api/authApi";

/**
 * useResetPassword (LOS-0512).
 *
 * A thin `useMutation` wrapper over `resetPassword` (`POST /auth/reset-password`).
 * Consumes a single-use token, replaces the account's password, and revokes all active
 * sessions across all devices. No new session is established.
 */
export function useResetPassword(): UseMutationResult<
  ResetPasswordResponse,
  Error,
  ResetPasswordRequest
> {
  return useMutation({
    mutationFn: resetPassword,
  });
}
