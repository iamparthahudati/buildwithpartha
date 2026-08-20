import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { readPublicEnvironment } from "@app/environment";
import { Alert } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, Heading, Link, Spinner, Text, TextInput } from "@components/ui";
import { ApiError } from "@lib/apiClient";

import { useResendVerification } from "../hooks/useResendVerification";
import { useVerifyEmail } from "../hooks/useVerifyEmail";
import "./verify-email-screen.css";

/**
 * VerifyEmailScreen (LOS-0511).
 *
 * Implements the full email verification lifecycle and recovery flows:
 * - `verifying`: in-flight token verification with accessible spinner
 * - `verified`: successful activation with direct sign-in navigation
 * - `expired`: token expired (24h TTL) with recovery resend form
 * - `invalid`: malformed/invalid token with recovery resend form
 * - `already-used`: token already consumed with sign-in guidance
 * - `sent`: verification mail sent confirmation with 60-second cooldown timer
 * - `request`: form to request/resend a verification link when no token is present
 *
 * Adheres strictly to account enumeration safety: resend confirmations are
 * identical whether an account exists, is active, or is unknown.
 */

const RATE_LIMITED_MESSAGE = "Too many attempts. Wait a few minutes before trying again.";
const GENERIC_VERIFY_FAILURE_MESSAGE = "We couldn't verify your email. Please try again.";
const GENERIC_RESEND_FAILURE_MESSAGE = "We couldn't send the verification email. Please try again.";
const EMAIL_SHAPE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_COOLDOWN_SECONDS = 60;

export type VerificationScreenState =
  "verifying" | "verified" | "expired" | "invalid" | "already-used" | "sent" | "request" | "error";

export interface VerifyEmailScreenProps {
  /** The token to verify; if omitted, read from `?token=` query param. */
  readonly token?: string;
  /** The email to target for resending; if omitted, read from `?email=` query param. */
  readonly initialEmail?: string;
  /** Initial cooldown seconds (defaults to 0 or 60 when starting in `sent` state). */
  readonly initialCooldownSeconds?: number;
  /** Overridable for tests; defaults to `window.location.assign`. */
  readonly navigate?: (url: string) => void;
}

export function VerifyEmailScreen({
  token: propToken,
  initialEmail: propEmail,
  initialCooldownSeconds,
  navigate = defaultNavigate,
}: VerifyEmailScreenProps) {
  const searchParams =
    typeof window !== "undefined" && window.location?.search
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const resolvedToken = propToken ?? searchParams.get("token") ?? undefined;
  const resolvedEmail = propEmail ?? searchParams.get("email") ?? "";

  const initialScreenState: VerificationScreenState = resolvedToken
    ? "verifying"
    : resolvedEmail
      ? "sent"
      : "request";

  const [screenState, setScreenState] = useState<VerificationScreenState>(initialScreenState);
  const [email, setEmail] = useState<string>(resolvedEmail);
  const [formErrors, setFormErrors] = useState<{ email?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(() => {
    if (initialCooldownSeconds !== undefined) {
      return initialCooldownSeconds;
    }
    return resolvedEmail && !resolvedToken ? DEFAULT_COOLDOWN_SECONDS : 0;
  });

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

  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus alert whenever submitError changes
  useEffect(() => {
    if (submitError !== null) {
      alertRef.current?.focus();
    }
  }, [submitError]);

  // Auto-verify token on mount when token is present
  const hasTriggeredVerificationRef = useRef(false);
  useEffect(() => {
    if (!resolvedToken || hasTriggeredVerificationRef.current) {
      return;
    }
    hasTriggeredVerificationRef.current = true;

    // `mutateAsync().then()/.catch()` rather than `.mutate(vars, { onSuccess,
    // onError })`: verified live against a real backend, the call-time
    // callback form never fires here — reactive mutation state (isSuccess/
    // isPending, which `SignupScreen` already relies on) keeps updating
    // correctly, but these one-off callbacks do not. Every prior test of
    // this screen ran against a mocked `fetch`, which never exposed it.
    verifyMutation
      .mutateAsync({ token: resolvedToken })
      .then(() => {
        setScreenState("verified");
        setSubmitError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.problem?.code === "TOKEN_EXPIRED") {
          setScreenState("expired");
        } else if (error instanceof ApiError && error.problem?.code === "TOKEN_ALREADY_USED") {
          setScreenState("already-used");
        } else if (error instanceof ApiError && error.problem?.code === "TOKEN_INVALID") {
          setScreenState("invalid");
        } else if (error instanceof ApiError && error.problem?.code === "RATE_LIMITED") {
          setScreenState("error");
          setSubmitError(RATE_LIMITED_MESSAGE);
        } else {
          setScreenState("error");
          setSubmitError(GENERIC_VERIFY_FAILURE_MESSAGE);
        }
      });
  }, [resolvedToken, verifyMutation]);

  const appBasePath = readPublicEnvironment().appBasePath.replace(/\/$/, "");
  const loginHref = `${appBasePath}/login`;
  const signupHref = `${appBasePath}/signup`;

  function handleResendForKnownEmail() {
    if (cooldown > 0 || resendMutation.isPending || !email.trim()) {
      return;
    }

    setSubmitError(null);
    // `mutateAsync().then()/.catch()` rather than `.mutate(vars, { onSuccess,
    // onError })`: verified live against a real backend, the call-time
    // callback form is unreliable. See this screen's auto-verify effect.
    resendMutation
      .mutateAsync({ email: email.trim() })
      .then(() => {
        setScreenState("sent");
        setCooldown(DEFAULT_COOLDOWN_SECONDS);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.problem?.code === "RATE_LIMITED") {
          setSubmitError(RATE_LIMITED_MESSAGE);
        } else {
          setSubmitError(GENERIC_RESEND_FAILURE_MESSAGE);
        }
      });
  }

  function handleResendFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (resendMutation.isPending) {
      return;
    }

    const trimmed = email.trim();
    if (!trimmed) {
      setFormErrors({ email: "Enter your email address." });
      if (summaryNodeRef.current !== null) {
        summaryNodeRef.current.focus();
      } else {
        pendingSummaryFocusRef.current = true;
      }
      return;
    }

    if (!EMAIL_SHAPE_PATTERN.test(trimmed)) {
      setFormErrors({ email: "Enter a valid email address." });
      if (summaryNodeRef.current !== null) {
        summaryNodeRef.current.focus();
      } else {
        pendingSummaryFocusRef.current = true;
      }
      return;
    }

    setFormErrors({});
    setSubmitError(null);

    // `mutateAsync().then()/.catch()` rather than `.mutate(vars, { onSuccess,
    // onError })`: verified live against a real backend, the call-time
    // callback form is unreliable. See this screen's auto-verify effect.
    resendMutation
      .mutateAsync({ email: trimmed })
      .then(() => {
        setScreenState("sent");
        setCooldown(DEFAULT_COOLDOWN_SECONDS);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.problem?.code === "RATE_LIMITED") {
          setSubmitError(RATE_LIMITED_MESSAGE);
        } else {
          setSubmitError(GENERIC_RESEND_FAILURE_MESSAGE);
        }
      });
  }

  // 1. Verifying State
  if (screenState === "verifying") {
    return (
      <section className="lifeos-verify-email-screen" aria-labelledby={headingId}>
        <div className="lifeos-verify-email-screen__loading" aria-live="polite">
          <Spinner size="lg" label="Verifying your email..." />
          <Heading level={1} id={headingId}>
            Verifying your email
          </Heading>
          <Text tone="secondary">Please wait while we verify your email address.</Text>
        </div>
      </section>
    );
  }

  // 2. Verified State
  if (screenState === "verified") {
    return (
      <section className="lifeos-verify-email-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Email verified
        </Heading>
        <div className="lifeos-verify-email-screen__content">
          <Text>
            Your email address has been verified. You can now sign in to your LifeOS account.
          </Text>
          <div className="lifeos-verify-email-screen__actions">
            <Button variant="primary" fullWidth onClick={() => navigateRef.current(loginHref)}>
              Sign in
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // 3. Already Used State
  if (screenState === "already-used") {
    return (
      <section className="lifeos-verify-email-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Verification link already used
        </Heading>
        <div className="lifeos-verify-email-screen__content">
          <Text>
            This verification link has already been used to activate an account. If your account is
            verified, you can sign in directly.
          </Text>
          <div className="lifeos-verify-email-screen__actions">
            <Button variant="primary" fullWidth onClick={() => navigateRef.current(loginHref)}>
              Sign in
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setScreenState("request");
                setSubmitError(null);
              }}
            >
              Request new link
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // 4. Expired State
  if (screenState === "expired") {
    return (
      <section className="lifeos-verify-email-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Verification link expired
        </Heading>

        <Alert tone="warning">
          This verification link has expired. Verification links expire after 24 hours for security.
        </Alert>

        {submitError !== null ? (
          <div ref={alertRef} tabIndex={-1}>
            <Alert tone="danger" announce="alert">
              {submitError}
            </Alert>
          </div>
        ) : null}

        <div className="lifeos-verify-email-screen__content">
          {email ? (
            <div className="lifeos-verify-email-screen__actions">
              <Button
                variant="primary"
                fullWidth
                disabled={cooldown > 0}
                loading={resendMutation.isPending}
                onClick={handleResendForKnownEmail}
              >
                {cooldown > 0 ? `Resend link (${cooldown}s)` : "Resend verification link"}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setScreenState("request");
                  setSubmitError(null);
                }}
              >
                Use different email
              </Button>
            </div>
          ) : (
            <div className="lifeos-verify-email-screen__actions">
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  setScreenState("request");
                  setSubmitError(null);
                }}
              >
                Request new verification link
              </Button>
            </div>
          )}

          <div className="lifeos-verify-email-screen__footer">
            <Text size="sm" tone="secondary">
              Already verified?{" "}
              <Link inline href={loginHref}>
                Sign in
              </Link>
            </Text>
          </div>
        </div>
      </section>
    );
  }

  // 5. Invalid State
  if (screenState === "invalid") {
    return (
      <section className="lifeos-verify-email-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Invalid verification link
        </Heading>

        <Alert tone="danger">
          We couldn&rsquo;t verify your email with this link. It may be broken or malformed.
        </Alert>

        {submitError !== null ? (
          <div ref={alertRef} tabIndex={-1}>
            <Alert tone="danger" announce="alert">
              {submitError}
            </Alert>
          </div>
        ) : null}

        <div className="lifeos-verify-email-screen__content">
          <div className="lifeos-verify-email-screen__actions">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setScreenState("request");
                setSubmitError(null);
              }}
            >
              Request new verification link
            </Button>
          </div>

          <div className="lifeos-verify-email-screen__footer">
            <Text size="sm" tone="secondary">
              Return to{" "}
              <Link inline href={loginHref}>
                Sign in
              </Link>{" "}
              or{" "}
              <Link inline href={signupHref}>
                Create account
              </Link>
            </Text>
          </div>
        </div>
      </section>
    );
  }

  // 6. Sent State (Check your email / Cooldown active)
  if (screenState === "sent") {
    return (
      <section className="lifeos-verify-email-screen" aria-labelledby={headingId}>
        <Heading level={1} id={headingId}>
          Check your email
        </Heading>

        {submitError !== null ? (
          <div ref={alertRef} tabIndex={-1}>
            <Alert tone="danger" announce="alert">
              {submitError}
            </Alert>
          </div>
        ) : null}

        <div className="lifeos-verify-email-screen__content">
          <Text>
            We&rsquo;ve sent verification instructions
            {email ? ` to ${email}` : ""}.
          </Text>
          <Text tone="muted" size="sm">
            The link expires in 24 hours. If it doesn&rsquo;t arrive soon, check your spam folder.
          </Text>

          <div className="lifeos-verify-email-screen__actions">
            <Button
              variant="secondary"
              fullWidth
              disabled={cooldown > 0}
              loading={resendMutation.isPending}
              onClick={handleResendForKnownEmail}
            >
              {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
            </Button>
          </div>

          <div className="lifeos-verify-email-screen__footer">
            <Text size="sm" tone="secondary">
              Need to change your email?{" "}
              <Link
                inline
                href="#change-email"
                onClick={(e) => {
                  e.preventDefault();
                  setScreenState("request");
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

  // 7. Request State (or Error fallback)
  return (
    <section className="lifeos-verify-email-screen" aria-labelledby={headingId}>
      <Heading level={1} id={headingId}>
        Resend verification email
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

        <form
          noValidate
          className="lifeos-verify-email-screen__form"
          onSubmit={handleResendFormSubmit}
        >
          <Text tone="secondary">
            Enter your email address and we&rsquo;ll send you a link to verify your account.
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

          <Button type="submit" variant="primary" fullWidth loading={resendMutation.isPending}>
            Send verification link
          </Button>

          <div className="lifeos-verify-email-screen__footer">
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
