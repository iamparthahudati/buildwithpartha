import type { ReactNode } from "react";
import { ArrowLeft, CircleAlert } from "lucide-react";

import { Button, Heading, Icon, Surface, Text } from "@components/ui";

import { Alert } from "./Alert";
import "./error-state.css";

/**
 * ErrorState (LOS-0411).
 *
 * The tone guide's error message formula — "What happened. What was
 * preserved/current. Next action." — maps directly onto this component's
 * three slots: `title` is what happened, `description` is what was
 * preserved, and `onRetry`/`onGoBack`/`onSignIn`/`action` are the next
 * action. As with `EmptyState` (LOS-0410), copy is always the caller's own;
 * nothing here invents a message.
 *
 * `scope="region"` composes `Alert` (LOS-0408) directly — the tone guide's
 * "Partial failure" rule keeps the rest of the page visible around the
 * error, which is exactly what an inline `Alert` already does.
 * `scope="page"` is the larger, centered block for a route or a whole
 * screen that failed to load, matching `EmptyState`'s visual weight without
 * reusing its component: `EmptyState`'s `variant` type describes reasons a
 * list is empty, not reasons a load failed, and forcing an error into that
 * type would be a false claim about what the five variants mean.
 */

export interface ErrorStateProps {
  readonly scope: "region" | "page";
  /** What happened. Never a stack trace, HTTP status, database/API name or raw exception text. */
  readonly title: string;
  /** What was preserved or is still current, when applicable. */
  readonly description?: string;
  /**
   * Shown as `Reference ID: {correlationId}`, never more. The safe id a
   * support conversation can be matched against server-side logs with —
   * everything else about the failure stays there, not in the UI.
   */
  readonly correlationId?: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly onGoBack?: () => void;
  readonly goBackLabel?: string;
  readonly onSignIn?: () => void;
  readonly signInLabel?: string;
  /** An escape hatch for a recovery action the three above don't cover, e.g. a Conflict's "Compare changes". */
  readonly action?: ReactNode;
  readonly className?: string;
}

export function ErrorState({
  scope,
  title,
  description,
  correlationId,
  onRetry,
  retryLabel = "Try again",
  onGoBack,
  goBackLabel = "Back",
  onSignIn,
  signInLabel = "Sign in",
  action,
  className,
}: ErrorStateProps) {
  const resolvedActions = (
    <>
      {onSignIn ? <Button onClick={onSignIn}>{signInLabel}</Button> : null}
      {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
      {onGoBack ? (
        <Button variant="secondary" iconStart={ArrowLeft} onClick={onGoBack}>
          {goBackLabel}
        </Button>
      ) : null}
      {action}
    </>
  );

  const correlation =
    correlationId === undefined ? null : (
      <Text tone="muted" size="xs" className="lifeos-error-state__correlation">
        Reference ID: <code>{correlationId}</code>
      </Text>
    );

  if (scope === "region") {
    return (
      <Alert
        tone="danger"
        heading={title}
        className={["lifeos-error-state", "lifeos-error-state--region", className]
          .filter(Boolean)
          .join(" ")}
        action={<div className="lifeos-error-state__actions">{resolvedActions}</div>}
      >
        {description}
        {correlation}
      </Alert>
    );
  }

  return (
    <Surface
      tone="muted"
      bordered={false}
      padding="lg"
      className={["lifeos-error-state", "lifeos-error-state--page", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon icon={CircleAlert} decorative className="lifeos-error-state__icon" />

      <Heading level={2} size="sm" className="lifeos-error-state__title">
        {title}
      </Heading>

      {description ? (
        <Text tone="secondary" size="sm" className="lifeos-error-state__description">
          {description}
        </Text>
      ) : null}

      <div className="lifeos-error-state__actions">{resolvedActions}</div>

      {correlation}
    </Surface>
  );
}
