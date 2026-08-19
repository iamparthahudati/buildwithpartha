import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import {
  resendVerification,
  type ResendVerificationRequest,
  type ResendVerificationResponse,
} from "../api/authApi";

/**
 * useResendVerification (LOS-0511).
 *
 * A thin `useMutation` wrapper over `resendVerification` (`POST /auth/resend-verification`).
 * Returns a generic PENDING_VERIFICATION response regardless of whether the email
 * exists or is unverified, maintaining account enumeration safety.
 */
export function useResendVerification(): UseMutationResult<
  ResendVerificationResponse,
  Error,
  ResendVerificationRequest
> {
  return useMutation({
    mutationFn: resendVerification,
  });
}
