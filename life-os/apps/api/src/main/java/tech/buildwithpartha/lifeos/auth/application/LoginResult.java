package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.User;

/**
 * A successful login's result: the safe {@link User} to shape into a response body, the raw session
 * token for the {@code Set-Cookie} header, and the raw CSRF token for the response body's CSRF
 * bootstrap field. Both {@link RawToken}s redact their own value in {@code toString()}, the same
 * protection {@code SignupService}'s local variables rely on rather than needing this type to add
 * its own.
 */
public record LoginResult(User user, RawToken sessionToken, RawToken csrfToken) {

  public LoginResult {
    Objects.requireNonNull(user, "user must not be null");
    Objects.requireNonNull(sessionToken, "sessionToken must not be null");
    Objects.requireNonNull(csrfToken, "csrfToken must not be null");
  }
}
