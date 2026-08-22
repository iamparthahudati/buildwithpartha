import { PasswordPolicy } from "./passwordPolicy";
import { resolveSignupFieldError } from "./signupFieldErrors";

/**
 * Client-side signup validation (LOS-0509).
 *
 * Mirrors `SignupRequest.java`'s Bean Validation constraints and
 * `PasswordPolicy`'s length bounds so an obviously invalid submission is
 * rejected before a round trip, reusing exactly the same copy
 * (`resolveSignupFieldError`) a server-reported failure would show — a field
 * left blank looks identical to the user whether this ran client-side or the
 * request came back with `NotBlank`. What this module cannot check —
 * whether the email already has an account, or whether the password is
 * commonly exposed — always waits for the server response; this is a
 * shortcut for the obvious cases, never a replacement authority.
 */

const EMAIL_MAX_LENGTH = 254;
const DISPLAY_NAME_MAX_LENGTH = 100;

// Deliberately simple: good enough to catch "clearly not an email" before a
// round trip. The server's own `@Email` validation remains the authority.
const EMAIL_SHAPE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignupFormValues {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly termsAccepted: boolean;
}

export type SignupFormErrors = Readonly<Record<string, string>>;

export function validateSignupForm(values: SignupFormValues): SignupFormErrors {
  const errors: Record<string, string> = {};

  const email = values.email.trim();
  if (email.length === 0) {
    errors.email = resolveSignupFieldError("email", "NotBlank");
  } else if (email.length > EMAIL_MAX_LENGTH) {
    errors.email = resolveSignupFieldError("email", "Size");
  } else if (!EMAIL_SHAPE_PATTERN.test(email)) {
    errors.email = resolveSignupFieldError("email", "Email");
  }

  const displayName = values.displayName.trim();
  if (displayName.length === 0) {
    errors.displayName = resolveSignupFieldError("displayName", "NotBlank");
  } else if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = resolveSignupFieldError("displayName", "Size");
  }

  if (values.password.length === 0) {
    errors.password = resolveSignupFieldError("password", "NotBlank");
  } else if (values.password.length < PasswordPolicy.MIN_LENGTH) {
    errors.password = resolveSignupFieldError("password", "TOO_SHORT");
  } else if (values.password.length > PasswordPolicy.MAX_LENGTH) {
    errors.password = resolveSignupFieldError("password", "TOO_LONG");
  }

  if (!values.termsAccepted) {
    errors.termsAccepted = "Accept the terms and privacy notice to continue.";
  }

  return errors;
}
