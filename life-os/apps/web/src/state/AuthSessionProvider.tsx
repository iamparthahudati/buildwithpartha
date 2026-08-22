import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { configureApiClient } from "@lib/apiClient";
import { buildLoginPathWithReturnTo, currentPathForReturnTo } from "@lib/returnPath";
import { getSession } from "@features/auth";

import { AuthSessionContext, type AuthSessionValue, type AuthUser } from "./authSession";

/**
 * AuthSessionProvider (LOS-0508).
 *
 * Owns the in-memory session (current user plus CSRF token) and is also
 * where the API client's two cross-cutting hooks are wired up, since this is
 * the one place both the session and the query cache are in scope together:
 *
 * - `configureApiClient`'s `getCsrfToken` always reads the *latest* token
 *   through a ref, not the value closed over at the last render, because
 *   `lib/apiClient.ts` calls it from plain `fetch` calls that happen outside
 *   React's render cycle;
 * - `onAuthenticationRequired` is this app's 401 recovery
 *   (`23-NAVIGATION-AND-ROUTES.md`: "On 401 ... clear private query caches
 *   and go to login with a validated same-origin relative `returnTo`"): drop
 *   the session, clear every cached query result, and navigate to login with
 *   the current address offered back as `returnTo`.
 *
 * Must be mounted under a `QueryClientProvider` — it calls `useQueryClient()`
 * directly rather than accepting one as a prop, since every real mount
 * composes them together (`app/AppProviders.tsx`) and a provider that could
 * silently run with no cache to clear would make the 401-recovery and
 * account-change guarantees above impossible to keep.
 */

interface AuthSessionState {
  readonly user: AuthUser | null;
  readonly csrfToken: string | null;
}

const LOGGED_OUT_STATE: AuthSessionState = Object.freeze({ user: null, csrfToken: null });

export interface AuthSessionProviderProps {
  readonly children: ReactNode;
  /** Overridable for tests; defaults to a real `window.location.assign` navigation. */
  readonly navigate?: (url: string) => void;
  /** Disable only in isolated tests whose request mock is reserved for the operation under test. */
  readonly restoreSession?: boolean;
}

export function AuthSessionProvider({
  children,
  navigate,
  restoreSession = true,
}: AuthSessionProviderProps) {
  const queryClient = useQueryClient();
  const [session, setSessionState] = useState<AuthSessionState>(LOGGED_OUT_STATE);
  const [bootstrapStatus, setBootstrapStatus] = useState<"pending" | "done">(
    restoreSession ? "pending" : "done",
  );
  const isBootstrapping = session.user === null && bootstrapStatus === "pending";

  // Kept current without retriggering the `configureApiClient` effect below
  // on every render — only `clearSession` changing identity should do that.
  const navigateRef = useRef(navigate ?? defaultNavigate);
  useEffect(() => {
    navigateRef.current = navigate ?? defaultNavigate;
  });

  // Mirrors `session` after every render so the stable callback handed to
  // `configureApiClient` can read the current value without being recreated
  // (and re-registered) every time the session itself changes. Written from
  // an effect, not during render, per `useAutoDismissTimer`'s own
  // `onExpireRef` precedent — a ref is a value read outside render, and
  // writing one while rendering is never safe.
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  });

  const clearSession = useCallback(() => {
    setSessionState(LOGGED_OUT_STATE);
    queryClient.clear();
  }, [queryClient]);

  const setSession = useCallback(
    (user: AuthUser, csrfToken: string) => {
      setSessionState((current) => {
        if (current.user !== null && current.user.id !== user.id) {
          queryClient.clear();
        }
        return { user, csrfToken };
      });
    },
    [queryClient],
  );

  useEffect(() => {
    configureApiClient({
      getCsrfToken: () => sessionRef.current.csrfToken,
      onAuthenticationRequired: () => {
        if (sessionRef.current.user === null) {
          // Nothing to recover from: either never signed in, or already
          // handled by an earlier failure in the same batch of requests.
          return;
        }
        clearSession();
        navigateRef.current(buildLoginPathWithReturnTo(currentPathForReturnTo()));
      },
    });
  }, [clearSession]);

  useEffect(() => {
    if (!restoreSession || session.user !== null) {
      return;
    }

    let cancelled = false;
    void getSession()
      .then((response) => {
        if (cancelled) {
          return;
        }
        const { csrfToken, ...user } = response;
        setSession(
          {
            id: String(user.id),
            email: user.email,
            displayName: user.displayName,
            timeZone: user.timeZone,
            locale: user.locale,
            weekStart: user.weekStart,
          },
          csrfToken,
        );
      })
      .catch(() => {
        // No cookie-backed session to restore after a full page load.
      })
      .finally(() => {
        if (!cancelled) {
          setBootstrapStatus("done");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [restoreSession, session.user, setSession]);

  const value = useMemo<AuthSessionValue>(
    () => ({
      user: session.user,
      csrfToken: session.csrfToken,
      isBootstrapping,
      setSession,
      clearSession,
    }),
    [session, isBootstrapping, setSession, clearSession],
  );

  return <AuthSessionContext value={value}>{children}</AuthSessionContext>;
}

function defaultNavigate(url: string): void {
  window.location.assign(url);
}
