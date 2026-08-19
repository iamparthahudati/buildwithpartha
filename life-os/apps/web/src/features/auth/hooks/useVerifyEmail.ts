import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { verifyEmail, type VerifyEmailRequest, type VerifyEmailResponse } from "../api/authApi";

/**
 * useVerifyEmail (LOS-0511).
 *
 * A thin `useMutation` wrapper over `verifyEmail` (`POST /auth/verify-email`).
 * Verification transitions the account from UNVERIFIED to ACTIVE, but does
 * not establish a session.
 */
export function useVerifyEmail(): UseMutationResult<
  VerifyEmailResponse,
  Error,
  VerifyEmailRequest
> {
  return useMutation({
    mutationFn: verifyEmail,
  });
}
