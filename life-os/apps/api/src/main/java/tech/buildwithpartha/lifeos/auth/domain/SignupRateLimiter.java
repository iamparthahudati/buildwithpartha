package tech.buildwithpartha.lifeos.auth.domain;

/**
 * A self-contained rate limit for the signup endpoint only ({@code 06-SECURITY.md}: "Rate limit ...
 * signup ..."). This is deliberately narrow, not the general per-IP/account/endpoint policy
 * framework {@code LOS-1401} will build; that ticket is expected to supersede this port and its
 * single in-memory adapter.
 */
public interface SignupRateLimiter {

  /**
   * @param key an opaque caller identity, today the request's client address
   * @return true when the caller may proceed, false when the limit is exceeded
   */
  boolean tryAcquire(String key);
}
