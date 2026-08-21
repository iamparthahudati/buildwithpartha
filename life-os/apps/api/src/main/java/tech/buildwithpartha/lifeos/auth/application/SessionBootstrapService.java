package tech.buildwithpartha.lifeos.auth.application;

import java.time.Clock;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;
import tech.buildwithpartha.lifeos.auth.domain.User;
import tech.buildwithpartha.lifeos.auth.domain.UserRepository;

/**
 * Restores the safe account profile and a fresh CSRF bootstrap for an already-authenticated browser
 * session ({@code GET /auth/session}). Only the CSRF secret rotates — the session cookie itself is
 * unchanged — because the frontend holds CSRF in memory and a full reload cannot recover the
 * original raw token from its stored hash.
 */
@Service
public class SessionBootstrapService {

  private final SessionRepository sessionRepository;
  private final UserRepository userRepository;
  private final SecureTokenGenerator tokenGenerator;
  private final Clock clock;

  public SessionBootstrapService(
      SessionRepository sessionRepository,
      UserRepository userRepository,
      SecureTokenGenerator tokenGenerator,
      Clock clock) {
    this.sessionRepository = sessionRepository;
    this.userRepository = userRepository;
    this.tokenGenerator = tokenGenerator;
    this.clock = clock;
  }

  @Transactional
  public Optional<SessionBootstrapResult> bootstrap(UUID authenticatedUserId, String sessionToken) {
    if (sessionToken == null || sessionToken.isBlank()) {
      return Optional.empty();
    }

    Optional<Session> activeSession =
        sessionRepository
            .findByTokenHash(tokenGenerator.hash(sessionToken))
            .filter(session -> session.isActive(clock.instant()))
            .filter(session -> session.userId().equals(authenticatedUserId));

    if (activeSession.isEmpty()) {
      return Optional.empty();
    }

    Optional<User> user =
        userRepository
            .findById(authenticatedUserId)
            .filter(candidate -> candidate.accountStatus() == AccountStatus.ACTIVE);

    if (user.isEmpty()) {
      return Optional.empty();
    }

    RawToken csrfToken = tokenGenerator.generate();
    boolean rotated =
        sessionRepository.rotateCsrfSecret(
            activeSession.get().id(), csrfToken.hash(), clock.instant());

    if (!rotated) {
      return Optional.empty();
    }

    return Optional.of(new SessionBootstrapResult(user.get(), csrfToken));
  }
}
