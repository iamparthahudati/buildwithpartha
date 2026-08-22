import { ErrorState } from "@components/feedback";

/**
 * UnavailableRoute (LOS-0603).
 *
 * `docs/wireframes/01-AUTH-ONBOARDING.md`: "Unavailable and Not Found use
 * `[C] ErrorState` with LifeOS identity, Retry/Go to entry, correlation ID
 * only for unexpected failures, and no authenticated navigation or private
 * cached content." No correlation ID here — this route is reached directly
 * (a maintenance link), not from a caught unexpected failure, so there is no
 * server-issued id to show.
 */
export function UnavailableRoute() {
  return (
    <ErrorState
      scope="page"
      title="LifeOS is temporarily unavailable"
      description="We're working on it. Please try again shortly."
      onRetry={() => window.location.reload()}
      retryLabel="Try again"
    />
  );
}
