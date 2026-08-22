import { PasswordPolicy } from "./passwordPolicy";

/**
 * Signup field-error copy (LOS-0509).
 *
 * `@lib/serverErrors`'s `groupFieldProblems` stops deliberately at the
 * field/code lookup — "turning a code into copy is the caller's job" — so
 * this module is that job for the signup form specifically. Every code here
 * comes from one of two places on the backend: Bean Validation's own code
 * name (`NotBlank`, `Email`, `Size`, from `SignupRequest.java`'s
 * annotations) for shape violations, or `PasswordPolicyViolation`'s enum
 * name (`TOO_SHORT`/`TOO_LONG`/`COMMONLY_EXPOSED`, always on the `password`
 * field) for policy violations `auth.application.SignupService` raises after
 * the request already parsed. Copy follows `30-CONTENT-AND-TONE-GUIDE.md`'s
 * approved validation examples and its `Password below current policy: "Use
 * at least {minimum} characters."` pattern exactly.
 */

const FIELD_ERROR_COPY: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  email: Object.freeze({
    NotBlank: "Enter your email address.",
    Email: "Enter an email address in the format name@example.com.",
    Size: "Enter an email address of 254 characters or fewer.",
  }),
  password: Object.freeze({
    NotBlank: "Enter a password.",
    TOO_SHORT: `Use at least ${PasswordPolicy.MIN_LENGTH} characters.`,
    TOO_LONG: `Use ${PasswordPolicy.MAX_LENGTH} characters or fewer.`,
    COMMONLY_EXPOSED: "This password appears in known data breaches. Choose a different one.",
  }),
  displayName: Object.freeze({
    NotBlank: "Enter your name.",
    Size: "Enter a name of 100 characters or fewer.",
  }),
});

const FALLBACK_MESSAGE = "Check this value and try again.";

/** Resolves one backend `{ field, code }` pair to approved LifeOS copy for the signup form. */
export function resolveSignupFieldError(field: string, code: string): string {
  return FIELD_ERROR_COPY[field]?.[code] ?? FALLBACK_MESSAGE;
}
