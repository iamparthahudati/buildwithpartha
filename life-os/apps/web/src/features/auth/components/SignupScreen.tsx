import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { readPublicEnvironment } from "@app/environment";
import { Alert } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, Checkbox, Heading, Link, PasswordInput, Text, TextInput } from "@components/ui";
import { ApiError } from "@lib/apiClient";
import { groupFieldProblems } from "@lib/serverErrors";

import { useSignup } from "../hooks/useSignup";
import { PRIVACY_VERSION, TERMS_VERSION } from "../model/legalVersions";
import { PasswordPolicy } from "../model/passwordPolicy";
import { resolveSignupFieldError } from "../model/signupFieldErrors";
import {
  validateSignupForm,
  type SignupFormErrors,
  type SignupFormValues,
} from "../model/signupValidation";
import "./signup-screen.css";

/**
 * SignupScreen (LOS-0509).
 *
 * Composes the already-built form primitives named in the ticket —
 * `FormField`/`FormFieldGroup`/`FormErrorSummary` (LOS-0401), `TextInput`/
 * `PasswordInput` (LOS-0314/0315), `Checkbox` (LOS-0311), `Button`
 * (LOS-0306), `Alert` (LOS-0408) — into the actual signup screen. No app
 * shell: this is the entire visible page, and success renders a pending
 * confirmation state in place of the form rather than any authenticated
 * destination.
 *
 * The response to a successful submit is always the same neutral "check your
 * email" state regardless of whether the email already had an account —
 * `SignupResponse` carries no field that could say otherwise, and
 * `24-CRITICAL-USER-JOURNEYS.md`'s enumeration-safety requirement means this
 * component must not invent a second branch (e.g. "you already have an
 * account") the backend never reports.
 */

const RATE_LIMITED_MESSAGE = "Too many attempts. Wait a few minutes before trying again.";
const GENERIC_FAILURE_MESSAGE = "We couldn't create your account. Your details are still here.";

const INITIAL_VALUES: SignupFormValues = Object.freeze({
  email: "",
  password: "",
  displayName: "",
  termsAccepted: false,
});

export function SignupScreen() {
  const [values, setValues] = useState<SignupFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const headingId = useId();
  const alertRef = useRef<HTMLDivElement>(null);

  // `FormErrorSummary` only mounts a real DOM node once `FormFieldGroup`'s
  // own registry context has a first error in it — `FormField` registers
  // itself from its own effect, one render cycle after this component's own
  // `setErrors` commits. A plain ref read straight after `setErrors` would
  // still see `null`. A callback ref sidesteps the race entirely: it fires
  // exactly when React actually attaches the node, however many render
  // cycles that took, so a focus request left pending here is honored the
  // moment the node exists rather than at a guessed-at "settled" point.
  const summaryNodeRef = useRef<HTMLDivElement | null>(null);
  const pendingSummaryFocusRef = useRef(false);
  // Stable identity: an inline function here would make React detach and
  // reattach the ref on every render, not only when the node itself changes.
  const summaryRefCallback = useCallback((node: HTMLDivElement | null) => {
    summaryNodeRef.current = node;
    if (node !== null && pendingSummaryFocusRef.current) {
      pendingSummaryFocusRef.current = false;
      node.focus();
    }
  }, []);

  const signupMutation = useSignup();

  /**
   * Applies a failure and moves focus to whichever surface now shows it —
   * `FormErrorSummary` for field errors (LOS-0401's own contract: focus goes
   * there only after a failed submit) or the page-level alert otherwise. The
   * alert has no such race: it is conditionally rendered directly from this
   * component's own `submitError` state, so it already exists in the DOM by
   * the time the render that set it has committed.
   */
  function applyFailure(next: { fieldErrors?: SignupFormErrors; alertMessage?: string }) {
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

  // The alert has no registration-hop race — it renders directly from this
  // component's own `submitError` state, so it already exists in the DOM by
  // the time this effect runs on the same commit that set it.
  useEffect(() => {
    if (submitError !== null) {
      alertRef.current?.focus();
    }
  }, [submitError]);

  if (signupMutation.isSuccess) {
    return <SignupPending email={values.email.trim()} />;
  }

  function updateValue<K extends keyof SignupFormValues>(key: K, value: SignupFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      key in current
        ? Object.fromEntries(Object.entries(current).filter(([field]) => field !== key))
        : current,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateSignupForm(values);
    if (Object.keys(validationErrors).length > 0) {
      applyFailure({ fieldErrors: validationErrors });
      return;
    }

    setErrors({});
    setSubmitError(null);

    // `mutateAsync().catch()` rather than `.mutate(vars, { onError })`:
    // verified live against a real backend, the call-time callback form is
    // unreliable (success already reads `signupMutation.isSuccess`
    // reactively above, which is unaffected). See VerifyEmailScreen/
    // LoginScreen.
    signupMutation
      .mutateAsync({
        email: values.email.trim(),
        password: values.password,
        displayName: values.displayName.trim(),
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.problem?.code === "VALIDATION_FAILED") {
          const grouped = groupFieldProblems(error.problem.errors);
          const mapped: Record<string, string> = {};
          for (const [field, code] of Object.entries(grouped)) {
            mapped[field] = resolveSignupFieldError(field, code);
          }
          applyFailure({ fieldErrors: mapped });
        } else if (error instanceof ApiError && error.problem?.code === "RATE_LIMITED") {
          applyFailure({ alertMessage: RATE_LIMITED_MESSAGE });
        } else {
          applyFailure({ alertMessage: GENERIC_FAILURE_MESSAGE });
        }
      });
  }

  const appBasePath = readPublicEnvironment().appBasePath.replace(/\/$/, "");
  const termsHref = `${appBasePath}/terms`;
  const privacyHref = `${appBasePath}/privacy`;

  return (
    <section className="lifeos-signup-screen" aria-labelledby={headingId}>
      <Heading level={1} id={headingId}>
        Create your account
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

        <form noValidate className="lifeos-signup-screen__form" onSubmit={handleSubmit}>
          <FormField
            name="displayName"
            label="Your name"
            {...(errors.displayName ? { error: errors.displayName } : {})}
          >
            {(field) => (
              <TextInput
                {...field}
                autoComplete="name"
                value={values.displayName}
                onChange={(event) => updateValue("displayName", event.target.value)}
              />
            )}
          </FormField>

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
            description={`At least ${PasswordPolicy.MIN_LENGTH} characters.`}
            {...(errors.password ? { error: errors.password } : {})}
          >
            {(field) => (
              <PasswordInput
                {...field}
                autoComplete="new-password"
                value={values.password}
                onChange={(event) => updateValue("password", event.target.value)}
              />
            )}
          </FormField>

          <div className="lifeos-signup-screen__consent">
            <Text size="sm" tone="secondary">
              By creating an account, you agree to the{" "}
              <Link inline href={termsHref}>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link inline href={privacyHref}>
                Privacy Policy
              </Link>
              .
            </Text>

            <FormField
              name="termsAccepted"
              label="I agree to the Terms of Service and Privacy Policy"
              {...(errors.termsAccepted ? { error: errors.termsAccepted } : {})}
            >
              {(field) => (
                <Checkbox
                  {...field}
                  checked={values.termsAccepted}
                  onChange={(event) => updateValue("termsAccepted", event.target.checked)}
                />
              )}
            </FormField>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={signupMutation.isPending}>
            Create account
          </Button>
        </form>
      </FormFieldGroup>
    </section>
  );
}

function SignupPending({ email }: { readonly email: string }) {
  const headingId = useId();

  return (
    <section className="lifeos-signup-screen" aria-labelledby={headingId}>
      <Heading level={1} id={headingId}>
        Check your email
      </Heading>
      <Text>We&rsquo;ve sent verification instructions to {email}.</Text>
      <Text tone="muted" size="sm">
        The link expires in 24 hours. If it doesn&rsquo;t arrive soon, check your spam folder.
      </Text>
    </section>
  );
}
