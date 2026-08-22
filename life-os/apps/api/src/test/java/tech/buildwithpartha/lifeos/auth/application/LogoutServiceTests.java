package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.RawToken;
import tech.buildwithpartha.lifeos.auth.domain.Session;
import tech.buildwithpartha.lifeos.common.error.CsrfTokenInvalidException;

class LogoutServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-18T12:00:00Z");

  @Test
  void logoutRevokesTheMatchingSessionWhenTheCsrfTokenMatches() {
    Fixture fixture = new Fixture();
    UUID userId = UUID.randomUUID();
    Session session = fixture.seedSession(userId);

    fixture.service.logout(fixture.command(fixture.sessionToken, fixture.csrfToken));

    Session reloaded = fixture.sessions.findByTokenHash(session.tokenHash()).orElseThrow();
    assertThat(reloaded.revokedAt()).contains(NOW);
  }

  @Test
  void logoutRejectsAMismatchedCsrfTokenAndLeavesTheSessionActive() {
    Fixture fixture = new Fixture();
    UUID userId = UUID.randomUUID();
    Session session = fixture.seedSession(userId);

    assertThatThrownBy(
            () -> fixture.service.logout(fixture.command(fixture.sessionToken, "wrong-csrf-value")))
        .isInstanceOf(CsrfTokenInvalidException.class);

    Session reloaded = fixture.sessions.findByTokenHash(session.tokenHash()).orElseThrow();
    assertThat(reloaded.revokedAt()).isEmpty();
  }

  @Test
  void logoutRejectsAMissingCsrfTokenWhenASessionIsActive() {
    Fixture fixture = new Fixture();
    fixture.seedSession(UUID.randomUUID());

    assertThatThrownBy(
            () -> fixture.service.logout(fixture.commandWithNoCsrf(fixture.sessionToken)))
        .isInstanceOf(CsrfTokenInvalidException.class);
  }

  @Test
  void logoutWithNoSessionCookieIsANoOpRatherThanAnError() {
    Fixture fixture = new Fixture();

    fixture.service.logout(fixture.commandWithNoSession());

    assertThat(fixture.sessions.all()).isEmpty();
  }

  @Test
  void logoutWithAnUnknownSessionTokenIsANoOp() {
    Fixture fixture = new Fixture();

    fixture.service.logout(fixture.command("not-a-real-session-token", "irrelevant"));
  }

  @Test
  void logoutOnAnAlreadyRevokedSessionIsANoOpEvenWithoutACsrfToken() {
    Fixture fixture = new Fixture();
    Session session = fixture.seedSession(UUID.randomUUID());
    fixture.sessions.revoke(session.id(), NOW);

    fixture.service.logout(fixture.commandWithNoCsrf(fixture.sessionToken));
  }

  @Test
  void logoutAllRevokesEveryActiveSessionForThatUserOnly() {
    Fixture fixture = new Fixture();
    UUID userId = UUID.randomUUID();
    fixture.seedSession(userId);
    Session secondSessionSameUser =
        fixture.sessions.save(
            Session.issue(
                UUID.randomUUID(),
                userId,
                "sha256:other-session",
                "sha256:other-csrf",
                NOW,
                Optional.empty()));
    UUID otherUserId = UUID.randomUUID();
    Session otherUsersSession =
        fixture.sessions.save(
            Session.issue(
                UUID.randomUUID(),
                otherUserId,
                "sha256:other-user-session",
                "sha256:other-user-csrf",
                NOW,
                Optional.empty()));

    fixture.service.logoutAll(fixture.command(fixture.sessionToken, fixture.csrfToken));

    assertThat(
            fixture
                .sessions
                .findByTokenHash(secondSessionSameUser.tokenHash())
                .orElseThrow()
                .revokedAt())
        .contains(NOW);
    assertThat(
            fixture
                .sessions
                .findByTokenHash(otherUsersSession.tokenHash())
                .orElseThrow()
                .revokedAt())
        .isEmpty();
  }

  @Test
  void logoutAllRejectsAMismatchedCsrfTokenAndRevokesNothing() {
    Fixture fixture = new Fixture();
    UUID userId = UUID.randomUUID();
    fixture.seedSession(userId);

    assertThatThrownBy(
            () ->
                fixture.service.logoutAll(
                    fixture.command(fixture.sessionToken, "wrong-csrf-value")))
        .isInstanceOf(CsrfTokenInvalidException.class);
  }

  private static final class Fixture {

    private final FakeSessionRepository sessions = new FakeSessionRepository();
    private final RawToken sessionRawToken =
        RawToken.of("session-raw-value", "sha256:session-hash");
    private final RawToken csrfRawToken = RawToken.of("csrf-raw-value", "sha256:csrf-hash");
    private final String sessionToken = sessionRawToken.value();
    private final String csrfToken = csrfRawToken.value();
    private final LogoutService service =
        new LogoutService(
            sessions,
            new FakeSecureTokenGenerator(sessionRawToken, csrfRawToken),
            Clock.fixed(NOW, ZoneOffset.UTC));

    private Session seedSession(UUID userId) {
      return sessions.save(
          Session.issue(
              UUID.randomUUID(),
              userId,
              sessionRawToken.hash(),
              csrfRawToken.hash(),
              NOW,
              Optional.empty()));
    }

    private LogoutCommand command(String sessionToken, String csrfToken) {
      return new LogoutCommand(Optional.of(sessionToken), Optional.of(csrfToken));
    }

    private LogoutCommand commandWithNoCsrf(String sessionToken) {
      return new LogoutCommand(Optional.of(sessionToken), Optional.empty());
    }

    private LogoutCommand commandWithNoSession() {
      return new LogoutCommand(Optional.empty(), Optional.empty());
    }
  }
}
