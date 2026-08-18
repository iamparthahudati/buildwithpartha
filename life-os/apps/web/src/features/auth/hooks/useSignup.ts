import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { signup, type SignupRequest, type SignupResponse } from "../api/authApi";

/**
 * useSignup (LOS-0509).
 *
 * A thin `useMutation` wrapper: signup never establishes a session (the
 * account starts `UNVERIFIED`), so unlike `useLogin` there is no session
 * state to update on success — `SignupScreen` only needs to know whether the
 * request is pending, succeeded or failed to choose which state to show.
 */
export function useSignup(): UseMutationResult<SignupResponse, Error, SignupRequest> {
  return useMutation({
    mutationFn: signup,
  });
}
