package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;

/**
 * Manages active sessions for authenticated accounts (LOS-0516).
 *
 * <p>Supports listing active sessions, revoking individual sessions by ID, and bulk revocation of
 * all other sessions while preserving the current one.
 */
@Service
public class SessionManagementService {

  static final Logger AUDIT_LOGGER =
      LoggerFactory.getLogger("tech.buildwithpartha.lifeos.auth.audit");

  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final Clock clock;

  public SessionManagementService(
      SessionRepository sessionRepository, SecureTokenGenerator tokenGenerator, Clock clock) {
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public List<SessionDto> listActiveSessions(UUID userId, Optional<String> currentSessionToken) {
    Instant now = clock.instant();
    Optional<UUID> currentSessionId =
        currentSessionToken
            .map(tokenGenerator::hash)
            .flatMap(sessionRepository::findByTokenHash)
            .filter(s -> s.userId().equals(userId) && s.isActive(now))
            .map(Session::id);

    List<Session> sessions = sessionRepository.findActiveSessionsByUserId(userId, now);
    return sessions.stream()
        .map(
            session ->
                new SessionDto(
                    session.id(),
                    session.deviceHint(),
                    session.createdAt(),
                    session.lastSeenAt(),
                    currentSessionId.map(id -> id.equals(session.id())).orElse(false)))
        .toList();
  }

  @Transactional
  public boolean revokeSession(UUID userId, UUID sessionId) {
    Instant now = clock.instant();
    Optional<Session> session = sessionRepository.findById(sessionId);
    if (session.isEmpty() || !session.get().userId().equals(userId)) {
      AUDIT_LOGGER.info(
          "event=session_revocation_failed reason=not_found_or_forbidden sessionId={}", sessionId);
      return false;
    }

    boolean revoked = sessionRepository.revoke(sessionId, now);
    AUDIT_LOGGER.info(
        "event=session_revoked userId={} sessionId={} revoked={}", userId, sessionId, revoked);
    return true;
  }

  @Transactional
  public int revokeAllOtherSessions(UUID userId, Optional<String> currentSessionToken) {
    Instant now = clock.instant();
    Optional<Session> currentSession =
        currentSessionToken
            .map(tokenGenerator::hash)
            .flatMap(sessionRepository::findByTokenHash)
            .filter(s -> s.userId().equals(userId) && s.isActive(now));

    int count;
    if (currentSession.isPresent()) {
      count =
          sessionRepository.revokeAllOtherSessionsForUser(userId, currentSession.get().id(), now);
    } else {
      count = sessionRepository.revokeAllForUser(userId, now);
    }

    AUDIT_LOGGER.info("event=all_other_sessions_revoked userId={} count={}", userId, count);
    return count;
  }
}
