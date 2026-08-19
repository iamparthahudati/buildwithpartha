import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { readPublicEnvironment } from "@app/environment";
import { Alert } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, Heading, Link, PasswordInput, Text } from "@components/ui";
import { ApiError } from "@lib/apiClient";
import { groupFieldProblems } from "@lib/serverErrors";

import { useResetPassword } from "../hooks/useResetPassword";
import { resolveResetPasswordFieldError } from "../model/resetPasswordFieldErrors";
import {
  validateResetPasswordForm,
  type ResetPasswordFormErrors,
  type ResetPasswordFormValues,
} from "../model/resetPasswordValidation";
import "./recovery-screen.css";

/**
 * ResetPasswordScreen (LOS-0512).
 *
 * Implements the password reset flow:
 * - `form`: new password and confirmation inputs, policy validation
 * - `missing-token`: guidance when navigating without a reset token
 * - `expired`: token expired (1h TTL) with recovery path
 * - `already-used`: token already consumed with sign-in and recovery paths
 * - `invalid`: malformed/invalid token with recovery path
 * - `success`: confirmation with session revocation notice and sign-in action
 *
 * Preserves safe input on policy violations so the link is not burned.
 */

const RATE_LIMITED_MESSAGE = "Too many attempts. Wait a few minutes before trying again.";
const GENERIC_FAILURE_MESSAGE = "We couldn't reset your password. Your details are still here.";

export type ResetPasswordScreenState =
  "form" | "missing-token" | "expired" | "already-used" | "invalid" | "success";

const INITIAL_VALUES: ResetPasswordFormValues = Object.freeze({
  newPassword: "",
  confirmPassword: "",
});

export interface ResetPasswordScreenProps {
  /** The token to consume; if omitted, read from `?token=` query param. */
  readonly token?: string;
  /** Overridable for tests; defaults to `window.location.assign`. */
  readonly navigate?: (url: string) => void;
}

export function ResetPasswordScreen({
  token: propToken,
  navigate = defaultNavigate,
}: ResetPasswordScreenProps) {
  const searchParams =
    typeof window !== "undefined" && window.location?.search
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const resolvedToken = propToken ?? searchParams.get("token") ?? undefined;

  const [screenState, setScreenState] = useState<ResetPasswordScreenState>(
    resolvedToken ? "form" : "missing-token",
  );
  const [values, setValues] = useState<ResetPasswordFormValues>(INITIAL_VALUES);
  const [formErrors, setFormErrors] = useState<ResetPasswordFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const headingId = useId();
  const alertRef = useRef<HTMLDivElement>(null);

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  const summaryNodeRef = useRef<HTMLDivElement | null>(null);
  const pendingSummaryFocusRef = useRef(false);
  const summaryRefCallback = useCallback((node: HTMLDivElement | null) => {
    summaryNodeRef.current = node;
    if (node !== null && pendingSummaryFocusRef.current) {
      pendingSummaryFocusRef.current = false;
      node.focus();
    }
  }, []);

  const resetPasswordMutation = useResetPassword();

  useEffect(() => {
    if (submitError !== null) {
      alertRef.current?.focus();
    }
  }, [submitError]);

  const appBasePath = readPublicEnvironment().appBasePath.replace(/\/$/, "");
  const loginHref = `${appBasePath}/login`;
  const forgotPasswordHref = `${appBasePath}/forgot-password`;

  function applyFailure(next: { fieldErrors?: ResetPasswordFormErrors; alertMessage?: string }) {
    setFormErrors(next.fieldErrors ?? {});
    setSubmitError(next.alertMessage ?? null);

    if (next.fieldErrors !== undefined && Object.keys(next.fieldErrors).length > 0) {
      if (summaryNodeRef.current !== null) {
        summaryNodeRef.current.focus();
      } else {
        pendingSummaryFocusRef.current = true;
      }
    }
  }

  function updateValue<K extends keyof ResetPasswordFormValues>(
    key: K,
    value: ResetPasswordFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setFormErrors((current) =>
      key in current
        ? Object.fromEntries(Object.entries(current).filter(([field]) => field !== key))
        : current,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (resetPasswordMutation.isPending || !resolvedToken) {
      return;
    }

    const validationErrors = validateResetPasswordForm(values);
    if (Object.keys(validationErrors).length > 0) {
      applyFailure({ fieldErrors: validationErrors });
      return;
    }

    setFormErrors({});
    setSubmitError(null);

    resetPasswordMutation.mutate(
      {
        token: resolvedToken,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          setScreenState("success");
          setSubmitError(null);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.problem?.code === "TOKEN_EXPIRED") {
            setScreenState("expired");
          } else if (error instanceof ApiError && error.problem?.code === "TOKEN_ALREADY_USED") {
            setScreenState("already-used");
          } else if (error instanceof ApiError && error.problem?.code === "TOKEN_INVALID") {
            setScreenState("invalid");
          } else if (error instanceof ApiError && error.problem?.code === "RATE_LIMITED") {
            applyFailure({ alertMessage: RATE_LIMITED_MESSAGE });
          } else if (
            error instanceof ApiError &&
            (error.problem?.code === "VALIDATION_FAILED" ||
              error.problem?.code === "FIELD_VALIDATION_FAILED")
          ) {
            const grouped = groupFieldProblems(error.problem.errors);
            const mapped: Record<string, string> = {};
            for (const [field, code] of Object.entries(grouped)) {
              mapped[field] = resolveResetPasswordFieldError(field, code);
            }
            applyFailure({ fieldErrors: mapped });
          } else {
            applyFailure({ alertMessage: GENERIC_FAILURE_MESSAGE });
          }
        },
      },
    );
  }

  // 1. Success State (with Session Revocation notice)
  if (screenState === "success") {
    return (
      <section className="lifeos-recovery-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Password reset successful
        </Heading>

        <div className="lifeos-recovery-screen__content">
          <Text>
            Your password has been changed. For your security, all active sessions on all devices
            have been signed out.
          </Text>
          <Text tone="secondary">Please sign in with your new password to continue.</Text>

          <div className="lifeos-recovery-screen__actions">
            <Button variant="primary" fullWidth onClick={() => navigateRef.current(loginHref)}>
              Sign in
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // 2. Missing Token State
  if (screenState === "missing-token") {
    return (
      <section className="lifeos-recovery-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Reset your password
        </Heading>

        <Alert tone="warning">
          A password reset link is required. Please use the link sent to your email, or request a
          new one.
        </Alert>

        <div className="lifeos-recovery-screen__content">
          <div className="lifeos-recovery-screen__actions">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigateRef.current(forgotPasswordHref)}
            >
              Request reset link
            </Button>
          </div>

          <div className="lifeos-recovery-screen__footer">
            <Text size="sm" tone="secondary">
              Remember your password?{" "}
              <Link inline href={loginHref}>
                Sign in
              </Link>
            </Text>
          </div>
        </div>
      </section>
    );
  }

  // 3. Expired State
  if (screenState === "expired") {
    return (
      <section className="lifeos-recovery-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Reset link expired
        </Heading>

        <Alert tone="warning">
          This password reset link has expired. Reset links expire after 1 hour for security.
        </Alert>

        <div className="lifeos-recovery-screen__content">
          <div className="lifeos-recovery-screen__actions">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigateRef.current(forgotPasswordHref)}
            >
              Request new reset link
            </Button>
          </div>

          <div className="lifeos-recovery-screen__footer">
            <Text size="sm" tone="secondary">
              Remember your password?{" "}
              <Link inline href={loginHref}>
                Sign in
              </Link>
            </Text>
          </div>
        </div>
      </section>
    );
  }

  // 4. Already Used State
  if (screenState === "already-used") {
    return (
      <section className="lifeos-recovery-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Reset link already used
        </Heading>

        <div className="lifeos-recovery-screen__content">
          <Text>
            This password reset link has already been used. If you recently reset your password, you
            can sign in with your new password.
          </Text>

          <div className="lifeos-recovery-screen__actions">
            <Button variant="primary" fullWidth onClick={() => navigateRef.current(loginHref)}>
              Sign in
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigateRef.current(forgotPasswordHref)}
            >
              Request new reset link
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // 5. Invalid State
  if (screenState === "invalid") {
    return (
      <section className="lifeos-recovery-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Invalid reset link
        </Heading>

        <Alert tone="danger">
          We couldn&rsquo;t reset your password with this link. It may be broken or malformed.
        </Alert>

        <div className="lifeos-recovery-screen__content">
          <div className="lifeos-recovery-screen__actions">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigateRef.current(forgotPasswordHref)}
            >
              Request new reset link
            </Button>
          </div>

          <div className="lifeos-recovery-screen__footer">
            <Text size="sm" tone="secondary">
              Return to{" "}
              <Link inline href={loginHref}>
                Sign in
              </Link>
            </Text>
          </div>
        </div>
      </section>
    );
  }

  // 6. Form State
  return (
    <section className="lifeos-recovery-screen" aria-labelledby={headingId}>
      <Heading level={1} id={headingId}>
        Set new password
      </Heading>

      <FormFieldGroup>
        <FormErrorSummary ref={summaryRefCallback} />

        {submitError !== null ? (
          <div ref={alertRef} tabIndex={-1}>
            <Alert tone="danger" announce="alert">
              {submitError}
            </Alert>
          </div>
        ) : null}

        <form noValidate className="lifeos-recovery-screen__form" onSubmit={handleSubmit}>
          <Text tone="secondary">Choose a new password for your account.</Text>

          <FormField
            name="newPassword"
            label="New password"
            description="Use at least 12 characters."
            {...(formErrors.newPassword ? { error: formErrors.newPassword } : {})}
          >
            {(field) => (
              <PasswordInput
                {...field}
                autoComplete="new-password"
                value={values.newPassword}
                onChange={(event) => updateValue("newPassword", event.target.value)}
              />
            )}
          </FormField>

          <FormField
            name="confirmPassword"
            label="Confirm new password"
            {...(formErrors.confirmPassword ? { error: formErrors.confirmPassword } : {})}
          >
            {(field) => (
              <PasswordInput
                {...field}
                autoComplete="new-password"
                value={values.confirmPassword}
                onChange={(event) => updateValue("confirmPassword", event.target.value)}
              />
            )}
          </FormField>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={resetPasswordMutation.isPending}
          >
            Reset password
          </Button>

          <div className="lifeos-recovery-screen__footer">
            <Text size="sm" tone="secondary">
              Remember your password?{" "}
              <Link inline href={loginHref}>
                Sign in
              </Link>
            </Text>
          </div>
        </form>
      </FormFieldGroup>
    </section>
  );
}

function defaultNavigate(url: string): void {
  window.location.assign(url);
}
