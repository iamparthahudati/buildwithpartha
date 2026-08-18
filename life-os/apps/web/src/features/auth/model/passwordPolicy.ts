/**
 * Client-side mirror of `auth.domain.PasswordPolicy` (LOS-0502/LOS-0509).
 *
 * Length only, matching the backend exactly: whether a password is commonly
 * exposed requires the backend's own wordlist and cannot be checked here.
 * Mirroring these bounds lets the signup form reject an obviously-too-short
 * or too-long password before a round trip, while the backend remains the
 * only authority — a client check that drifted from the server's would just
 * be a confusing false negative/positive, so this stays a plain re-statement
 * of `PasswordPolicy.java`'s two constants rather than an independent guess.
 */
export const PasswordPolicy = Object.freeze({
  MIN_LENGTH: 12,
  MAX_LENGTH: 128,
});
