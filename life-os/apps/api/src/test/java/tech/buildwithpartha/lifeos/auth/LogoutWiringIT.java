package tech.buildwithpartha.lifeos.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.application.LogoutCommand;
import tech.buildwithpartha.lifeos.auth.application.LogoutService;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.SecureTokenGenerator;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.auth.domain.SessionRepository;

/**
 * Proves Spring wires the real {@code JpaSessionRepository} and {@code Sha256SecureTokenGenerator}
 * into {@link LogoutService}, not only that the fakes used by {@code LogoutServiceTests} behave,
 * matching {@code LoginWiringIT}'s (LOS-0505) precedent.
 */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class LogoutWiringIT {

  private final LogoutService logoutService;
  private final SessionRepository sessionRepository;
  private final SecureTokenGenerator tokenGenerator;

  @Autowired
  LogoutWiringIT(
      LogoutService logoutService,
      SessionRepository sessionRepository,
      SecureTokenGenerator tokenGenerator) {
    this.logoutService = logoutService;
    this.sessionRepository = sessionRepository;
    this.tokenGenerator = tokenGenerator;
  }

  @Test
  void wiresTheRealAdaptersEndToEndAndRevokesAPersistedSession() {
    Instant now = Instant.now();
    RawToken sessionToken = tokenGenerator.generate();
    RawToken csrfToken = tokenGenerator.generate();
    Session session =
        sessionRepository.save(
            Session.issue(
                UUID.randomUUID(),
                UUID.randomUUID(),
                sessionToken.hash(),
                csrfToken.hash(),
                now,
                Optional.empty()));

    logoutService.logout(
        new LogoutCommand(Optional.of(sessionToken.value()), Optional.of(csrfToken.value())));

    assertThat(sessionRepository.findByTokenHash(session.tokenHash()).orElseThrow().revokedAt())
        .isPresent();
  }
}
