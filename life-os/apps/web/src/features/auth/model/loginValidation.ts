import { resolveLoginFieldError } from "./loginFieldErrors";

/**
 * Client-side login validation (LOS-0510).
 *
 * Validates that required credentials (email, password) are present and in a
 * plausible shape before a round trip to `POST /auth/login`, reusing the same
 * approved copy (`resolveLoginFieldError`) as server-reported shape errors.
 * Credential verification itself is strictly server-side.
 */

const EMAIL_MAX_LENGTH = 254;
const EMAIL_SHAPE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginFormValues {
  readonly email: string;
  readonly password: string;
}

export type LoginFormErrors = Readonly<Record<string, string>>;

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: Record<string, string> = {};

  const email = values.email.trim();
  if (email.length === 0) {
    errors.email = resolveLoginFieldError("email", "NotBlank");
  } else if (email.length > EMAIL_MAX_LENGTH) {
    errors.email = resolveLoginFieldError("email", "Size");
  } else if (!EMAIL_SHAPE_PATTERN.test(email)) {
    errors.email = resolveLoginFieldError("email", "Email");
  }

  if (values.password.length === 0) {
    errors.password = resolveLoginFieldError("password", "NotBlank");
  }

  return errors;
}
