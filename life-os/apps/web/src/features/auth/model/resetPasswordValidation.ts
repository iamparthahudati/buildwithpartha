import { PasswordPolicy } from "./passwordPolicy";
import { resolveResetPasswordFieldError } from "./resetPasswordFieldErrors";

/**
 * Client-side reset password validation (LOS-0512).
 *
 * Validates new password length bounds and confirmation match.
 */

export interface ResetPasswordFormValues {
  readonly newPassword: string;
  readonly confirmPassword: string;
}

export type ResetPasswordFormErrors = Readonly<Record<string, string>>;

export function validateResetPasswordForm(
  values: ResetPasswordFormValues,
): ResetPasswordFormErrors {
  const errors: Record<string, string> = {};

  if (values.newPassword.length === 0) {
    errors.newPassword = resolveResetPasswordFieldError("newPassword", "NotBlank");
  } else if (values.newPassword.length < PasswordPolicy.MIN_LENGTH) {
    errors.newPassword = resolveResetPasswordFieldError("newPassword", "TOO_SHORT");
  } else if (values.newPassword.length > PasswordPolicy.MAX_LENGTH) {
    errors.newPassword = resolveResetPasswordFieldError("newPassword", "TOO_LONG");
  }

  if (values.confirmPassword.length === 0) {
    errors.confirmPassword = resolveResetPasswordFieldError("confirmPassword", "NotBlank");
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = resolveResetPasswordFieldError("confirmPassword", "MISMATCH");
  }

  return errors;
}
