package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A self-contained rate limit for the verification-resend request endpoint only ({@code
 * 06-SECURITY.md}: "Rate limit ... verification resend ..."), keyed by caller address the same way
 * {@link SignupRateLimiter}/{@link PasswordResetRateLimiter} are.
 */
public interface ResendVerificationRateLimiter {

  /**
   * @param key an opaque caller identity, today the request's client address
   * @return true when the caller may proceed, false when the limit is exceeded
   */
  boolean tryAcquire(String key);
}
