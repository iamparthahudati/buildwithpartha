package tech.buildwithpartha.lifeos.auth.application;

import java.util.Objects;
import java.util.Optional;

/**
 * The logout use case's input. Both fields are optional because logout must be safely callable with
 * no session cookie at all (already logged out) — there is nothing to be strict about validating
 * here, unlike every other command in this package.
 */
public record LogoutCommand(Optional<String> sessionToken, Optional<String> csrfToken) {

  public LogoutCommand {
    Objects.requireNonNull(sessionToken, "sessionToken must not be null");
    Objects.requireNonNull(csrfToken, "csrfToken must not be null");
  }
}
