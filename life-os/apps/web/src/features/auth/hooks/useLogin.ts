import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useAuthSession } from "@state/authSession";

import { login, type LoginRequest, type LoginResponse } from "../api/authApi";

/**
 * useLogin (LOS-0508).
 *
 * Wraps `authApi.login` and, on success, hands the safe user fields and the
 * one-time CSRF bootstrap value to `AuthSessionProvider` — the only place
 * they are ever held. `LoginResponse.csrfToken` is intentionally excluded
 * from the stored `AuthUser`: it is a credential-adjacent secret, not a
 * profile field, and keeping it out of the object other code reads for
 * display purposes is one fewer place it could accidentally be logged or
 * rendered. Ready for LOS-0510's login screen to call; no screen exists yet.
 */
export function useLogin(): UseMutationResult<LoginResponse, Error, LoginRequest> {
  const { setSession } = useAuthSession();

  return useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      const { csrfToken, ...user } = response;
      setSession(user, csrfToken);
    },
  });
}
