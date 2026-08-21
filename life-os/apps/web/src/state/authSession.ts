import { createContext, useContext } from "react";

/**
 * The auth session's shared shape (LOS-0508).
 *
 * Kept apart from `AuthSessionProvider.tsx` so this file exports only
 * types/data and that one only its component — the same split
 * `toastQueue.ts`/`ToastProvider.tsx` and `formFieldRegistry.ts`/`FormField.tsx`
 * already use.
 *
 * Both `user` and `csrfToken` live only here, in memory, for the lifetime of
 * the tab: `06-SECURITY.md`'s "Browser authentication is the session cookie.
 * Frontend code never reads it" and the ticket's own "no browser token
 * storage" line rule out `localStorage`/`sessionStorage`/a cookie this code
 * writes itself. A full page reload always starts from `{ user: null,
 * csrfToken: null }` — there is currently no `GET /auth/session` endpoint to
 * silently restore either value from the still-valid `HttpOnly` cookie (see
 * `docs/handoffs/LOS-0508.md`'s "Known limitations").
 */

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly timeZone: string;
  readonly locale: string;
  readonly weekStart: number;
}

export interface AuthSessionValue {
  readonly user: AuthUser | null;
  readonly csrfToken: string | null;
  /** True while the provider is attempting to restore a cookie-backed session after load. */
  readonly isBootstrapping: boolean;
  /**
   * Records a freshly issued session (after login). Clears every cached
   * query result first if this replaces a *different* signed-in account —
   * an account change without an intervening logout — since every cached
   * result up to that point belongs to the account that is about to stop
   * being current.
   */
  readonly setSession: (user: AuthUser, csrfToken: string) => void;
  /** Drops the in-memory session and clears every cached query result. */
  readonly clearSession: () => void;
}

export const AuthSessionContext = createContext<AuthSessionValue | undefined>(undefined);

/**
 * The one way application code reads or changes the current session. Throws
 * outside an `AuthSessionProvider` rather than silently returning a
 * logged-out value, the same reasoning `useToast` uses: a component that
 * thinks it has session state but does not is a bug worth surfacing
 * immediately, not a component quietly rendering as if signed out.
 */
export function useAuthSession(): AuthSessionValue {
  const value = useContext(AuthSessionContext);
  if (value === undefined) {
    throw new Error("useAuthSession must be used within an AuthSessionProvider.");
  }
  return value;
}
