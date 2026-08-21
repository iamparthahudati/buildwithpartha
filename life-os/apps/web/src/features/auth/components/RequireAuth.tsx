import { useEffect, useRef, type ReactNode } from "react";

import { buildLoginPathWithReturnTo, currentPathForReturnTo } from "@lib/returnPath";
import { useAuthSession } from "@state/authSession";

/**
 * RequireAuth (LOS-0508).
 *
 * The route guard the ticket names, built on `window.location`/`history`
 * directly rather than a router: no routing library is wired into LifeOS yet
 * (`useDeepLinkParam`'s own docstring records the same state), and
 * `LOS-0603` — "Build application shell ... protected routing" — is where a
 * real router composes this component around an actual protected route. It
 * is deliberately usable today regardless of what that router turns out to
 * be, the same reasoning `useDeepLinkParam` gives for its own History API use.
 *
 * `23-NAVIGATION-AND-ROUTES.md`: "Protected navigation checks the server
 * session; client guards improve UX but are not authorization." This
 * component is exactly that UX improvement — it hides content and redirects
 * promptly so an unauthenticated visitor never sees a flash of protected
 * content — never the actual authorization boundary, which every protected
 * endpoint enforces server-side regardless of what this component does.
 *
 * Renders nothing (not even a loading state) while `user` is `null`: any
 * protected content is exactly what must not flash on screen before the
 * redirect takes effect.
 */
export interface RequireAuthProps {
  readonly children: ReactNode;
  /** Overridable for tests; defaults to a real `window.location.assign` navigation. */
  readonly navigate?: (url: string) => void;
}

export function RequireAuth({ children, navigate }: RequireAuthProps) {
  const { user, isBootstrapping } = useAuthSession();

  // Kept current without retriggering the redirect effect on every render —
  // only a real change in `user` should ever cause a second redirect.
  const navigateRef = useRef(navigate ?? defaultNavigate);
  useEffect(() => {
    navigateRef.current = navigate ?? defaultNavigate;
  });

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }
    if (user === null) {
      navigateRef.current(buildLoginPathWithReturnTo(currentPathForReturnTo()));
    }
  }, [user, isBootstrapping]);

  if (isBootstrapping || user === null) {
    return null;
  }

  return <>{children}</>;
}

function defaultNavigate(url: string): void {
  window.location.assign(url);
}
