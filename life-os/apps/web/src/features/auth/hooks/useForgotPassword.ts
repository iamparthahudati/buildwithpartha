import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import {
  forgotPassword,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
} from "../api/authApi";

/**
 * useForgotPassword (LOS-0512).
 *
 * A thin `useMutation` wrapper over `forgotPassword` (`POST /auth/forgot-password`).
 * Returns a generic REQUESTED response regardless of whether the email exists or is active,
 * maintaining account enumeration safety.
 */
export function useForgotPassword(): UseMutationResult<
  ForgotPasswordResponse,
  Error,
  ForgotPasswordRequest
> {
  return useMutation({
    mutationFn: forgotPassword,
  });
}
