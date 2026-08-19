import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "./ErrorState";

/**
 * ErrorBoundary (LOS-0603).
 *
 * A class component because React only recognizes `getDerivedStateFromError`/
 * `componentDidCatch` on one — there is no hook equivalent. Catches a render
 * error anywhere in `children` and replaces it with `ErrorState`'s
 * `scope="page"` presentation rather than a blank white screen, the same
 * "what happened, what's still current, next action" contract every other
 * failure surface in LifeOS already uses. Never logs or renders the actual
 * error message/stack — `ErrorState`'s own contract already forbids that,
 * and a caught render error is exactly the kind of internal detail
 * `06-SECURITY.md` keeps out of the UI.
 *
 * `AppShell` remounts this (via a `key` tied to the route) on every
 * navigation, so a caught error does not strand every later page behind the
 * same frozen fallback.
 */

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Intentionally no console/telemetry call yet: LifeOS has no client
    // error-reporting pipeline. Adding one is a separate, reviewed ticket
    // (it would need its own data-handling review), not a side effect of
    // this component existing.
  }

  private handleRetry = (): void => {
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorState
          scope="page"
          title="Something went wrong"
          description="Your other data is unaffected. Reloading this page usually fixes it."
          onRetry={this.handleRetry}
          retryLabel="Reload page"
        />
      );
    }

    return this.props.children;
  }
}
