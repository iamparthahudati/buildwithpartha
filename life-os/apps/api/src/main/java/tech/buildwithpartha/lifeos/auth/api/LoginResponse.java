package tech.buildwithpartha.lifeos.auth.api;

import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.domain.User;

/**
 * The safe login response shape: enough of the account to render the shell immediately, plus the
 * CSRF bootstrap value the ticket names. The session token itself never appears here — it travels
 * only in the {@code Set-Cookie} header, and being {@code HttpOnly} means frontend code could not
 * read it from this body even if it were echoed.
 */
public record LoginResponse(
    UUID id,
    String email,
    String displayName,
    String timeZone,
    String locale,
    int weekStart,
    String csrfToken) {

  public static LoginResponse of(User user, String csrfToken) {
    return new LoginResponse(
        user.id(),
        user.email().raw(),
        user.displayName(),
        user.timeZone(),
        user.locale(),
        user.weekStart(),
        csrfToken);
  }
}
