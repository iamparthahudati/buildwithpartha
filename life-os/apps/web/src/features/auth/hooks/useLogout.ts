import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { loginPath } from "@lib/returnPath";
import { useAuthSession } from "@state/authSession";

import { logout, logoutAll, type LogoutResponse } from "../api/authApi";

export interface UseLogoutOptions {
  /** `true` calls `/auth/logout-all` ("sign out all devices") instead of the current session only. */
  readonly allDevices?: boolean;
  /** Overridable for tests; defaults to a real `window.location.assign` navigation. */
  readonly navigate?: (url: string) => void;
}

/**
 * useLogout (LOS-0508).
 *
 * On success, drops the in-memory session — which itself clears every
 * cached query result, `AuthSessionProvider`'s job — and returns to the
 * login page: `23-NAVIGATION-AND-ROUTES.md`'s "Logout clears client private
 * state then returns to login/public entry." No `returnTo` is offered here;
 * a deliberate sign-out has no "back to what I was doing" destination the
 * way an expired-session redirect does.
 *
 * A rejected request (LOS-0506: a mismatched/missing CSRF header, `403`)
 * leaves the session untouched on the server, so the in-memory session is
 * left alone here too rather than optimistically cleared.
 */
export function useLogout(
  options: UseLogoutOptions = {},
): UseMutationResult<LogoutResponse, Error, void> {
  const { allDevices = false, navigate = defaultNavigate } = options;
  const { clearSession } = useAuthSession();

  return useMutation({
    mutationFn: () => (allDevices ? logoutAll() : logout()),
    onSuccess: () => {
      clearSession();
      navigate(loginPath());
    },
  });
}

function defaultNavigate(url: string): void {
  window.location.assign(url);
}
