import { resolveForgotPasswordFieldError } from "./forgotPasswordFieldErrors";

/**
 * Client-side forgot password validation (LOS-0512).
 *
 * Mirrors `ForgotPasswordRequest.java`'s Bean Validation constraints so an obviously
 * invalid submission is rejected before a round trip, reusing exactly the same copy.
 */

const EMAIL_MAX_LENGTH = 254;
const EMAIL_SHAPE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ForgotPasswordFormValues {
  readonly email: string;
}

export type ForgotPasswordFormErrors = Readonly<Record<string, string>>;

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): ForgotPasswordFormErrors {
  const errors: Record<string, string> = {};

  const email = values.email.trim();
  if (email.length === 0) {
    errors.email = resolveForgotPasswordFieldError("email", "NotBlank");
  } else if (email.length > EMAIL_MAX_LENGTH) {
    errors.email = resolveForgotPasswordFieldError("email", "Size");
  } else if (!EMAIL_SHAPE_PATTERN.test(email)) {
    errors.email = resolveForgotPasswordFieldError("email", "Email");
  }

  return errors;
}
