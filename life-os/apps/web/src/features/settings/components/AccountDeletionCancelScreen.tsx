import { useEffect, useRef, useState } from "react";

import { readPublicEnvironment } from "@app/environment";
import { Alert } from "@components/feedback";
import { Button, Heading, Link, Spinner, Text } from "@components/ui";
import { ApiError } from "@lib/apiClient";

import { useCancelAccountDeletion } from "../hooks/useCancelAccountDeletion";
import "./account-deletion-cancel-screen.css";

/**
 * AccountDeletionCancelScreen (LOS-0518 grace-period follow-up).
 *
 * The landing page for the cancellation link `AccountDeletionService` emails: consumes the
 * single-use token on mount and reports the outcome. No app shell — like `VerifyEmailScreen`,
 * this is reached without an active session (the deletion request revoked it), so it is the
 * entire visible page.
 */

const GENERIC_FAILURE_MESSAGE = "We couldn't cancel the deletion. Please try again.";

export type AccountDeletionCancelScreenState =
  "verifying" | "cancelled" | "invalid" | "expired" | "already-used" | "error";

export interface AccountDeletionCancelScreenProps {
  /** The token to consume; if omitted, read from `?token=` query param. */
  readonly token?: string;
  /** Overridable for tests; defaults to `window.location.assign`. */
  readonly navigate?: (url: string) => void;
}

export function AccountDeletionCancelScreen({
  token: propToken,
  navigate = defaultNavigate,
}: AccountDeletionCancelScreenProps) {
  const searchParams =
    typeof window !== "undefined" && window.location?.search
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const resolvedToken = propToken ?? searchParams.get("token") ?? undefined;

  const [screenState, setScreenState] = useState<AccountDeletionCancelScreenState>(
    resolvedToken ? "verifying" : "invalid",
  );

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  const cancelMutation = useCancelAccountDeletion();

  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    if (!resolvedToken || hasTriggeredRef.current) {
      return;
    }
    hasTriggeredRef.current = true;

    cancelMutation.mutate(
      { token: resolvedToken },
      {
        onSuccess: () => {
          setScreenState("cancelled");
        },
        onError: (error) => {
          if (error instanceof ApiError && error.problem?.code === "TOKEN_EXPIRED") {
            setScreenState("expired");
          } else if (error instanceof ApiError && error.problem?.code === "TOKEN_ALREADY_USED") {
            setScreenState("already-used");
          } else if (error instanceof ApiError && error.problem?.code === "TOKEN_INVALID") {
            setScreenState("invalid");
          } else {
            setScreenState("error");
          }
        },
      },
    );
  }, [resolvedToken, cancelMutation]);

  const appBasePath = readPublicEnvironment().appBasePath.replace(/\/$/, "");
  const loginHref = `${appBasePath}/login`;

  if (screenState === "verifying") {
    return (
      <section className="lifeos-account-deletion-cancel-screen" aria-live="polite">
        <Spinner size="lg" label="Cancelling deletion request..." />
        <Heading level={1}>Cancelling deletion request</Heading>
        <Text tone="secondary">Please wait a moment.</Text>
      </section>
    );
  }

  if (screenState === "cancelled") {
    return (
      <section className="lifeos-account-deletion-cancel-screen">
        <Heading level={1}>Deletion cancelled</Heading>
        <Text>Your account is active again. Sign in with your existing password to continue.</Text>
        <Button variant="primary" onClick={() => navigateRef.current(loginHref)}>
          Sign in
        </Button>
      </section>
    );
  }

  if (screenState === "already-used") {
    return (
      <section className="lifeos-account-deletion-cancel-screen">
        <Heading level={1}>Link already used</Heading>
        <Text>
          This cancellation link was already used, or the account was already restored. If you can
          sign in, your account is active.
        </Text>
        <Link inline href={loginHref}>
          Go to sign in
        </Link>
      </section>
    );
  }

  if (screenState === "expired") {
    return (
      <section className="lifeos-account-deletion-cancel-screen">
        <Heading level={1}>Account already deleted</Heading>
        <Alert tone="warning">
          The grace period for this account has already ended and it has been permanently deleted.
          This cancellation link can no longer restore it.
        </Alert>
      </section>
    );
  }

  if (screenState === "invalid") {
    return (
      <section className="lifeos-account-deletion-cancel-screen">
        <Heading level={1}>Invalid cancellation link</Heading>
        <Alert tone="danger">
          We couldn&rsquo;t find a matching deletion request for this link. It may be broken or
          malformed.
        </Alert>
        <Link inline href={loginHref}>
          Go to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="lifeos-account-deletion-cancel-screen">
      <Heading level={1}>Something went wrong</Heading>
      <Alert tone="danger">{GENERIC_FAILURE_MESSAGE}</Alert>
    </section>
  );
}

function defaultNavigate(url: string): void {
  window.location.assign(url);
}
