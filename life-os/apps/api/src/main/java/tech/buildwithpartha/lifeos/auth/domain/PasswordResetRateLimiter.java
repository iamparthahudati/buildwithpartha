package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A self-contained rate limit for the forgot-password request endpoint only ({@code
 * 06-SECURITY.md}: "Rate limit ... reset ..."), keyed by caller address the same way {@link
 * SignupRateLimiter}/{@link LoginRateLimiter} are. Reset-password (the token-consuming endpoint) is
 * not rate limited by this port, matching how email verification's own consuming endpoint
 * (LOS-0504) was not rate limited either — only the request-issuing side is. This is deliberately
 * narrow, not the general per-IP/account/endpoint policy framework {@code LOS-1401} will build.
 */
public interface PasswordResetRateLimiter {

  /**
   * @param key an opaque caller identity, today the request's client address
   * @return true when the caller may proceed, false when the limit is exceeded
   */
  boolean tryAcquire(String key);
}
