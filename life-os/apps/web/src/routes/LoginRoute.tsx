import { useNavigate } from "react-router-dom";

import { LoginScreen } from "@features/auth";

/**
 * LoginRoute (LOS-0603). Mounts LOS-0510's `LoginScreen` at `/life-os/login`.
 *
 * Overrides `LoginScreen`'s default `navigate` (`window.location.assign`,
 * necessary when it was built since no router existed yet) with the
 * router's own client-side `navigate`. A full-page navigation right after
 * login would tear down the whole app — including the in-memory session
 * `useLogin`'s `onSuccess` just set — before the destination route ever
 * gets to render with it: `06-SECURITY.md`'s "the session lives only in
 * memory" combined with there being no `GET /auth/session` endpoint means a
 * hard reload always starts logged out again. Staying client-side avoids
 * that reload entirely, so the freshly-set session survives to land on the
 * protected route.
 */
export function LoginRoute() {
  const navigate = useNavigate();
  return <LoginScreen navigate={navigate} />;
}
