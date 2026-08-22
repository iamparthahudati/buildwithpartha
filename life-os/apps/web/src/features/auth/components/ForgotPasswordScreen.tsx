import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { readPublicEnvironment } from "@app/environment";
import { Alert } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, Heading, Link, Text, TextInput } from "@components/ui";
import { ApiError } from "@lib/apiClient";
import { groupFieldProblems } from "@lib/serverErrors";

import { useForgotPassword } from "../hooks/useForgotPassword";
import { resolveForgotPasswordFieldError } from "../model/forgotPasswordFieldErrors";
import {
  validateForgotPasswordForm,
  type ForgotPasswordFormErrors,
  type ForgotPasswordFormValues,
} from "../model/forgotPasswordValidation";
import "./recovery-screen.css";

/**
 * ForgotPasswordScreen (LOS-0512).
 *
 * Implements the password recovery request flow:
 * - `form`: email input, client-side validation, accessible error summary
 * - `sent`: generic confirmation preventing account enumeration
 *
 * Preserves entered input on failure, handles rate limits, and provides direct
 * return-to-login navigation.
 */

const RATE_LIMITED_MESSAGE = "Too many attempts. Wait a few minutes before trying again.";
const GENERIC_FAILURE_MESSAGE = "We couldn't process your request. Your details are still here.";

export type ForgotPasswordScreenState = "form" | "sent";

export interface ForgotPasswordScreenProps {
  /** The email to prefill; if omitted, read from `?email=` query param or empty. */
  readonly initialEmail?: string;
  /** Overridable for tests; defaults to `window.location.assign`. */
  readonly navigate?: (url: string) => void;
}

export function ForgotPasswordScreen({
  initialEmail: propEmail,
  navigate = defaultNavigate,
}: ForgotPasswordScreenProps) {
  const searchParams =
    typeof window !== "undefined" && window.location?.search
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const resolvedInitialEmail = propEmail ?? searchParams.get("email") ?? "";

  const [screenState, setScreenState] = useState<ForgotPasswordScreenState>("form");
  const [email, setEmail] = useState<string>(resolvedInitialEmail);
  const [formErrors, setFormErrors] = useState<ForgotPasswordFormErrors>({});
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

  const forgotPasswordMutation = useForgotPassword();

  useEffect(() => {
    if (submitError !== null) {
      alertRef.current?.focus();
    }
  }, [submitError]);

  const appBasePath = readPublicEnvironment().appBasePath.replace(/\/$/, "");
  const loginHref = `${appBasePath}/login`;

  function applyFailure(next: { fieldErrors?: ForgotPasswordFormErrors; alertMessage?: string }) {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (forgotPasswordMutation.isPending) {
      return;
    }

    const trimmed = email.trim();
    const values: ForgotPasswordFormValues = { email: trimmed };
    const validationErrors = validateForgotPasswordForm(values);

    if (Object.keys(validationErrors).length > 0) {
      applyFailure({ fieldErrors: validationErrors });
      return;
    }

    setFormErrors({});
    setSubmitError(null);

    // `mutateAsync().then()/.catch()` rather than `.mutate(vars, { onSuccess,
    // onError })`: verified live against a real backend, the call-time
    // callback form is unreliable. See VerifyEmailScreen/LoginScreen.
    forgotPasswordMutation
      .mutateAsync({ email: trimmed })
      .then(() => {
        setScreenState("sent");
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.problem?.code === "RATE_LIMITED") {
          applyFailure({ alertMessage: RATE_LIMITED_MESSAGE });
        } else if (
          error instanceof ApiError &&
          (error.problem?.code === "VALIDATION_FAILED" ||
            error.problem?.code === "FIELD_VALIDATION_FAILED")
        ) {
          const grouped = groupFieldProblems(error.problem.errors);
          const mapped: Record<string, string> = {};
          for (const [field, code] of Object.entries(grouped)) {
            mapped[field] = resolveForgotPasswordFieldError(field, code);
          }
          applyFailure({ fieldErrors: mapped });
        } else {
          applyFailure({ alertMessage: GENERIC_FAILURE_MESSAGE });
        }
      });
  }

  // Sent State (Check your email / confirmation)
  if (screenState === "sent") {
    return (
      <section className="lifeos-recovery-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Check your email
        </Heading>

        <div className="lifeos-recovery-screen__content">
          <Text>
            If an account matches {email ? <strong>{email}</strong> : "that email address"},
            we&rsquo;ve sent password reset instructions.
          </Text>
          <Text tone="muted" size="sm">
            The link expires in 1 hour. If it doesn&rsquo;t arrive soon, check your spam folder.
          </Text>

          <div className="lifeos-recovery-screen__actions">
            <Button variant="primary" fullWidth onClick={() => navigateRef.current(loginHref)}>
              Return to sign in
            </Button>
          </div>

          <div className="lifeos-recovery-screen__footer">
            <Text size="sm" tone="secondary">
              Need to try another email?{" "}
              <Link
                inline
                href="#retry"
                onClick={(e) => {
                  e.preventDefault();
                  setScreenState("form");
                  setSubmitError(null);
                }}
              >
                Enter a different address
              </Link>
            </Text>
          </div>
        </div>
      </section>
    );
  }

  // Form State
  return (
    <section className="lifeos-recovery-screen" aria-labelledby={headingId}>
      <Heading level={1} id={headingId}>
        Reset your password
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
          <Text tone="secondary">
            Enter your email address and we&rsquo;ll send you a link to reset your password.
          </Text>

          <FormField
            name="email"
            label="Email"
            {...(formErrors.email ? { error: formErrors.email } : {})}
          >
            {(field) => (
              <TextInput
                {...field}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (formErrors.email) {
                    setFormErrors({});
                  }
                }}
              />
            )}
          </FormField>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={forgotPasswordMutation.isPending}
          >
            Send reset link
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
