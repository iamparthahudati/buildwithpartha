import { PasswordPolicy } from "./passwordPolicy";

/**
 * Reset-password field-error copy (LOS-0512).
 *
 * Maps backend problem details codes and client validation codes for new password fields.
 */

const FIELD_ERROR_COPY: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  newPassword: Object.freeze({
    NotBlank: "Enter a new password.",
    TOO_SHORT: `Use at least ${PasswordPolicy.MIN_LENGTH} characters.`,
    TOO_LONG: `Use ${PasswordPolicy.MAX_LENGTH} characters or fewer.`,
    COMMONLY_EXPOSED: "This password appears in known data breaches. Choose a different one.",
  }),
  confirmPassword: Object.freeze({
    NotBlank: "Confirm your new password.",
    MISMATCH: "Passwords do not match.",
  }),
});

const FALLBACK_MESSAGE = "Check this value and try again.";

/** Resolves one backend `{ field, code }` pair to approved LifeOS copy for the reset password form. */
export function resolveResetPasswordFieldError(field: string, code: string): string {
  return FIELD_ERROR_COPY[field]?.[code] ?? FALLBACK_MESSAGE;
}
