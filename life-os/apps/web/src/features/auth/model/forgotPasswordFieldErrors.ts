/**
 * Forgot-password field-error copy (LOS-0512).
 *
 * Maps server-side problem details codes to tone guide copy.
 */

const FIELD_ERROR_COPY: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  email: Object.freeze({
    NotBlank: "Enter your email address.",
    Email: "Enter an email address in the format name@example.com.",
    Size: "Enter an email address of 254 characters or fewer.",
  }),
});

const FALLBACK_MESSAGE = "Check this value and try again.";

/** Resolves one backend `{ field, code }` pair to approved LifeOS copy for the forgot password form. */
export function resolveForgotPasswordFieldError(field: string, code: string): string {
  return FIELD_ERROR_COPY[field]?.[code] ?? FALLBACK_MESSAGE;
}
