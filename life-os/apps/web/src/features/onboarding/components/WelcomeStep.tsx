import { useCallback, useRef, useState, type FormEvent } from "react";

import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, Heading, Text, TextInput } from "@components/ui";

import { resolveWelcomeFieldErrors } from "../model/onboardingFieldErrors";
import {
  validateWelcomeForm,
  type WelcomeFormErrors,
  type WelcomeFormValues,
} from "../model/onboardingValidation";

export interface WelcomeStepProps {
  readonly initialDisplayName: string;
  readonly email: string;
  readonly isSubmitting: boolean;
  readonly onSubmit: (values: WelcomeFormValues) => Promise<void> | void;
}

export function WelcomeStep({
  initialDisplayName,
  email,
  isSubmitting,
  onSubmit,
}: WelcomeStepProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [errors, setErrors] = useState<WelcomeFormErrors>({});

  const summaryNodeRef = useRef<HTMLDivElement | null>(null);
  const pendingSummaryFocusRef = useRef(false);
  const summaryRefCallback = useCallback((node: HTMLDivElement | null) => {
    summaryNodeRef.current = node;
    if (node !== null && pendingSummaryFocusRef.current) {
      pendingSummaryFocusRef.current = false;
      node.focus();
    }
  }, []);

  function applyFailure(nextErrors: WelcomeFormErrors) {
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (summaryNodeRef.current !== null) {
        summaryNodeRef.current.focus();
      } else {
        pendingSummaryFocusRef.current = true;
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: WelcomeFormValues = { displayName };
    const fieldErrors = validateWelcomeForm(values);

    if (Object.keys(fieldErrors).length > 0) {
      applyFailure(fieldErrors);
      return;
    }

    setErrors({});
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      const serverFieldErrors = resolveWelcomeFieldErrors(err);
      if (Object.keys(serverFieldErrors).length > 0) {
        applyFailure(serverFieldErrors);
      }
    }
  }

  return (
    <div className="lifeos-onboarding-step">
      <div className="lifeos-onboarding-step__header">
        <Heading level={1} size="xl">
          Welcome to LifeOS
        </Heading>
        <Text size="md" tone="secondary">
          Private planning, execution, and review in one place.
        </Text>
      </div>

      <form className="lifeos-onboarding-step__form" onSubmit={handleSubmit} noValidate>
        <FormFieldGroup>
          <FormErrorSummary ref={summaryRefCallback} title="Check your name" />

          <FormField
            name="displayName"
            label="Display name"
            description="What should LifeOS call you?"
            {...(errors.displayName ? { error: errors.displayName } : {})}
          >
            {(field) => (
              <TextInput
                {...field}
                value={displayName}
                autoComplete="name"
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  if (errors.displayName) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.displayName;
                      return next;
                    });
                  }
                }}
              />
            )}
          </FormField>

          <div className="lifeos-onboarding-step__readonly-field">
            <Text size="xs" weight="medium" tone="secondary">
              Verified email
            </Text>
            <Text size="md">{email || "—"}</Text>
            <Text size="xs" tone="muted">
              Used for secure sign-in and account recovery. Cannot be changed during onboarding.
            </Text>
          </div>

          <div className="lifeos-onboarding-step__note">
            <Text size="sm" tone="secondary">
              You can start empty and adjust any of these preferences later in Settings.
            </Text>
          </div>

          <div className="lifeos-onboarding-step__actions">
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Continue
            </Button>
          </div>
        </FormFieldGroup>
      </form>
    </div>
  );
}
