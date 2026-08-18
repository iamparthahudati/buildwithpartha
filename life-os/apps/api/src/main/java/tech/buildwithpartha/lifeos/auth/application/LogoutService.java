package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.common.error.CsrfTokenInvalidException;

/**
 * Revokes the current session, or every session belonging to its user ("sign out all devices"),
 * LOS-0506.
 *
 * <p>Both {@link #logout} and {@link #logoutAll} are deliberately idempotent no-ops when the
 * presented session token names no active session at all — a missing cookie, an unknown token, or
 * one that already expired or was already revoked. There is nothing left to protect in that case,
 * so there is nothing to reject either; the caller's intent ("I want to be logged out") is already
 * true. Only when an active session is actually found does a CSRF check apply at all, matching the
 * ticket's own "require CSRF as applicable" wording — {@code auth.api.AuthController} clears the
 * cookie in its response after either method returns normally, but never reaches that line when
 * this throws {@link CsrfTokenInvalidException}, so a rejected request leaves every cookie and
 * server-side session state exactly as it was.
 */
@Service
public class LogoutService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final Clock clock;

  public LogoutService(
      SessionRepository sessionRepository, SecureTokenGenerator tokenGenerator, Clock clock) {
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.clock = clock;
  }

  @Transactional
  public void logout(LogoutCommand command) {
    Optional<Session> session = activeSession(command);
    if (session.isEmpty()) {
      AUDIT_LOGGER.info("event=logout_noop");
      return;
    }

    requireMatchingCsrf(session.get(), command);
    sessionRepository.revoke(session.get().id(), clock.instant());
    AUDIT_LOGGER.info("event=logout_succeeded");
  }

  @Transactional
  public void logoutAll(LogoutCommand command) {
    Optional<Session> session = activeSession(command);
    if (session.isEmpty()) {
      AUDIT_LOGGER.info("event=logout_all_noop");
      return;
    }

    requireMatchingCsrf(session.get(), command);
    int revoked = sessionRepository.revokeAllForUser(session.get().userId(), clock.instant());
    AUDIT_LOGGER.info("event=logout_all_succeeded count={}", revoked);
  }

  private Optional<Session> activeSession(LogoutCommand command) {
    return command
        .sessionToken()
        .map(tokenGenerator::hash)
        .flatMap(sessionRepository::findByTokenHash)
        .filter(session -> session.isActive(clock.instant()));
  }

  private void requireMatchingCsrf(Session session, LogoutCommand command) {
    boolean matches =
        command
            .csrfToken()
            .map(tokenGenerator::hash)
            .filter(session.csrfSecretHash()::equals)
            .isPresent();
    if (!matches) {
      AUDIT_LOGGER.info("event=logout_failed reason=csrf_mismatch");
      throw new CsrfTokenInvalidException("missing or mismatched CSRF token");
    }
  }
}
