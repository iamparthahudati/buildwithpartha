import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { readPublicEnvironment } from "@app/environment";
import { Alert } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, Heading, Link, PasswordInput, Text, TextInput } from "@components/ui";
import { ApiError } from "@lib/apiClient";
import { resolveReturnTarget } from "@lib/returnPath";
import { groupFieldProblems } from "@lib/serverErrors";

import { useLogin } from "../hooks/useLogin";
import { resolveLoginFieldError } from "../model/loginFieldErrors";
import {
  validateLoginForm,
  type LoginFormErrors,
  type LoginFormValues,
} from "../model/loginValidation";
import "./login-screen.css";

/**
 * LoginScreen (LOS-0510).
 *
 * Composes the already-built form primitives named in the ticket —
 * `FormField`/`FormFieldGroup`/`FormErrorSummary` (LOS-0401), `TextInput`/
 * `PasswordInput` (LOS-0314/0315), `Button` (LOS-0306), `Alert` (LOS-0408) —
 * into the actual login screen. No app shell: this is the entire visible page.
 *
 * Handles client validation, generic failure messages preventing account enumeration,
 * rate limit handling, pending submission deduplication, and safe redirection via
 * `resolveReturnTarget` (falling back to `/life-os/app/today`).
 */

const INVALID_CREDENTIALS_MESSAGE = "Email or password is incorrect.";
const RATE_LIMITED_MESSAGE = "Too many attempts. Wait a few minutes before trying again.";
const GENERIC_FAILURE_MESSAGE = "We couldn't sign you in. Your details are still here.";

const INITIAL_VALUES: LoginFormValues = Object.freeze({
  email: "",
  password: "",
});

export interface LoginScreenProps {
  /** Overridable for tests; defaults to a real `window.location.assign` navigation. */
  readonly navigate?: (url: string) => void;
}

export function LoginScreen({ navigate = defaultNavigate }: LoginScreenProps) {
  const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const headingId = useId();
  const alertRef = useRef<HTMLDivElement>(null);

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  // `FormErrorSummary` only mounts a real DOM node once `FormFieldGroup`'s
  // own registry context has a first error in it — `FormField` registers
  // itself from its own effect, one render cycle after this component's own
  // `setErrors` commits. A callback ref sidesteps the race entirely.
  const summaryNodeRef = useRef<HTMLDivElement | null>(null);
  const pendingSummaryFocusRef = useRef(false);
  const summaryRefCallback = useCallback((node: HTMLDivElement | null) => {
    summaryNodeRef.current = node;
    if (node !== null && pendingSummaryFocusRef.current) {
      pendingSummaryFocusRef.current = false;
      node.focus();
    }
  }, []);

  const loginMutation = useLogin();

  function applyFailure(next: { fieldErrors?: LoginFormErrors; alertMessage?: string }) {
    setErrors(next.fieldErrors ?? {});
    setSubmitError(next.alertMessage ?? null);

    if (next.fieldErrors !== undefined && Object.keys(next.fieldErrors).length > 0) {
      if (summaryNodeRef.current !== null) {
        summaryNodeRef.current.focus();
      } else {
        pendingSummaryFocusRef.current = true;
      }
    }
  }

  useEffect(() => {
    if (submitError !== null) {
      alertRef.current?.focus();
    }
  }, [submitError]);

  function updateValue<K extends keyof LoginFormValues>(key: K, value: LoginFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      key in current
        ? Object.fromEntries(Object.entries(current).filter(([field]) => field !== key))
        : current,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loginMutation.isPending) {
      return;
    }

    const validationErrors = validateLoginForm(values);
    if (Object.keys(validationErrors).length > 0) {
      applyFailure({ fieldErrors: validationErrors });
      return;
    }

    setErrors({});
    setSubmitError(null);

    loginMutation.mutate(
      {
        email: values.email.trim(),
        password: values.password,
      },
      {
        onSuccess: () => {
          const searchParams = new URLSearchParams(window.location.search);
          const rawReturnTo = searchParams.get("returnTo");
          const target = resolveReturnTarget(rawReturnTo);
          navigateRef.current(target);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.problem?.code === "INVALID_CREDENTIALS") {
            applyFailure({ alertMessage: INVALID_CREDENTIALS_MESSAGE });
          } else if (error instanceof ApiError && error.problem?.code === "VALIDATION_FAILED") {
            const grouped = groupFieldProblems(error.problem.errors);
            const mapped: Record<string, string> = {};
            for (const [field, code] of Object.entries(grouped)) {
              mapped[field] = resolveLoginFieldError(field, code);
            }
            applyFailure({ fieldErrors: mapped });
          } else if (error instanceof ApiError && error.problem?.code === "RATE_LIMITED") {
            applyFailure({ alertMessage: RATE_LIMITED_MESSAGE });
          } else {
            applyFailure({ alertMessage: GENERIC_FAILURE_MESSAGE });
          }
        },
      },
    );
  }

  const appBasePath = readPublicEnvironment().appBasePath.replace(/\/$/, "");
  const forgotPasswordHref = `${appBasePath}/forgot-password`;
  const signupHref = `${appBasePath}/signup`;

  return (
    <section className="lifeos-login-screen" aria-labelledby={headingId}>
      <Heading level={1} id={headingId}>
        Sign in to LifeOS
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

        <form noValidate className="lifeos-login-screen__form" onSubmit={handleSubmit}>
          <FormField name="email" label="Email" {...(errors.email ? { error: errors.email } : {})}>
            {(field) => (
              <TextInput
                {...field}
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => updateValue("email", event.target.value)}
              />
            )}
          </FormField>

          <FormField
            name="password"
            label="Password"
            {...(errors.password ? { error: errors.password } : {})}
          >
            {(field) => (
              <PasswordInput
                {...field}
                autoComplete="current-password"
                value={values.password}
                onChange={(event) => updateValue("password", event.target.value)}
              />
            )}
          </FormField>

          <div className="lifeos-login-screen__links">
            <Link inline href={forgotPasswordHref}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loginMutation.isPending}>
            Sign in
          </Button>

          <div className="lifeos-login-screen__footer">
            <Text size="sm" tone="secondary">
              Don&rsquo;t have an account?{" "}
              <Link inline href={signupHref}>
                Create account
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
