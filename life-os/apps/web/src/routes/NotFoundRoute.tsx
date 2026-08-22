import { useNavigate } from "react-router-dom";

import { ErrorState } from "@components/feedback";

/**
 * NotFoundRoute (LOS-0603).
 *
 * `23-NAVIGATION-AND-ROUTES.md`: "Unknown protected routes show a private
 * Not Found page inside the shell. Unknown public routes show a public Not
 * Found page without shell/private cache." Both are the same honest "what
 * happened, next action" message `ErrorState` already gives every other
 * failure surface — only the recovery destination differs, since a signed-in
 * visitor's useful "home" is Today and a signed-out visitor's is the public
 * entry. `variant="private"` is only ever reached already inside `AppShell`
 * (nested under the protected layout route), so it never needs to render
 * shell chrome itself.
 */

export interface NotFoundRouteProps {
  readonly variant: "public" | "private";
}

export function NotFoundRoute({ variant }: NotFoundRouteProps) {
  const navigate = useNavigate();

  return (
    <ErrorState
      scope="page"
      title="Page not found"
      description="The page you're looking for doesn't exist or may have moved."
      onGoBack={() => navigate(variant === "private" ? "/life-os/app/today" : "/life-os")}
      goBackLabel={variant === "private" ? "Go to Today" : "Go to entry"}
    />
  );
}
