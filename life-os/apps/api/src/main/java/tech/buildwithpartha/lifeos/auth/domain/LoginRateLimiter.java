package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A self-contained rate limit for the login endpoint only ({@code 06-SECURITY.md}: "Rate limit
 * login ..."), keyed by caller address the same way {@link SignupRateLimiter} is. This is
 * deliberately narrow, not the general per-IP/account/endpoint policy framework {@code LOS-1401}
 * will build; that ticket is expected to supersede this port and its single in-memory adapter, and
 * is also where a per-account (not just per-address) brute-force defense belongs.
 */
public interface LoginRateLimiter {

  /**
   * @param key an opaque caller identity, today the request's client address
   * @return true when the caller may proceed, false when the limit is exceeded
   */
  boolean tryAcquire(String key);
}
