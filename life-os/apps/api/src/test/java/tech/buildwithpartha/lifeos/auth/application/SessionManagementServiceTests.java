package tech.buildwithpartha.lifeos.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.auth.domain.Session;

class SessionManagementServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-19T10:00:00Z");
  private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

  private FakeSessionRepository sessionRepository;
  private FakeSecureTokenGenerator tokenGenerator;
  private SessionManagementService sessionManagementService;

  private UUID userId;

  @BeforeEach
  void setUp() {
    sessionRepository = new FakeSessionRepository();
    tokenGenerator = new FakeSecureTokenGenerator();
    sessionManagementService =
        new SessionManagementService(sessionRepository, tokenGenerator, CLOCK);

    userId = UUID.randomUUID();
  }

  @Test
  void listsActiveSessionsAndIdentifiesCurrentSession() {
    String currentRawToken = "current-raw-token";
    Session currentSession =
        new Session(
            UUID.randomUUID(),
            userId,
            tokenGenerator.hash(currentRawToken),
            "csrf-1",
            NOW.minusSeconds(3600),
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Mac Chrome"));
    sessionRepository.save(currentSession);

    Session otherSession =
        new Session(
            UUID.randomUUID(),
            userId,
            "other-token-hash",
            "csrf-2",
            NOW.minusSeconds(7200),
            NOW.minusSeconds(100),
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("iPhone Safari"));
    sessionRepository.save(otherSession);

    List<SessionDto> sessionsWithCurrent =
        sessionManagementService.listActiveSessions(userId, Optional.of(currentRawToken));

    assertThat(sessionsWithCurrent).hasSize(2);
    assertThat(sessionsWithCurrent.get(0).id()).isEqualTo(currentSession.id());
    assertThat(sessionsWithCurrent.get(0).isCurrent()).isTrue();
    assertThat(sessionsWithCurrent.get(1).id()).isEqualTo(otherSession.id());
    assertThat(sessionsWithCurrent.get(1).isCurrent()).isFalse();

    List<SessionDto> sessionsWithoutCurrent =
        sessionManagementService.listActiveSessions(userId, Optional.empty());
    assertThat(sessionsWithoutCurrent).hasSize(2);
    assertThat(sessionsWithoutCurrent.get(0).isCurrent()).isFalse();
    assertThat(sessionsWithoutCurrent.get(1).isCurrent()).isFalse();
  }

  @Test
  void revokesSpecificSessionBelongingToUser() {
    Session session =
        new Session(
            UUID.randomUUID(),
            userId,
            "hash",
            "csrf",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Device"));
    sessionRepository.save(session);

    boolean revoked = sessionManagementService.revokeSession(userId, session.id());
    assertThat(revoked).isTrue();
    assertThat(sessionRepository.findById(session.id()).orElseThrow().isActive(NOW)).isFalse();
  }

  @Test
  void refusesToRevokeNonExistentSession() {
    boolean revoked = sessionManagementService.revokeSession(userId, UUID.randomUUID());
    assertThat(revoked).isFalse();
  }

  @Test
  void refusesToRevokeSessionBelongingToAnotherUser() {
    UUID otherUserId = UUID.randomUUID();
    Session otherUserSession =
        new Session(
            UUID.randomUUID(),
            otherUserId,
            "hash",
            "csrf",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Other Device"));
    sessionRepository.save(otherUserSession);

    boolean revoked = sessionManagementService.revokeSession(userId, otherUserSession.id());
    assertThat(revoked).isFalse();
    assertThat(sessionRepository.findById(otherUserSession.id()).orElseThrow().isActive(NOW))
        .isTrue();
  }

  @Test
  void revokesAllOtherSessionsForUser() {
    String currentRawToken = "current-raw-token";
    Session currentSession =
        new Session(
            UUID.randomUUID(),
            userId,
            tokenGenerator.hash(currentRawToken),
            "csrf-1",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Mac"));
    sessionRepository.save(currentSession);

    Session other1 =
        new Session(
            UUID.randomUUID(),
            userId,
            "hash-2",
            "csrf-2",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Phone"));
    sessionRepository.save(other1);

    Session other2 =
        new Session(
            UUID.randomUUID(),
            userId,
            "hash-3",
            "csrf-3",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Tablet"));
    sessionRepository.save(other2);

    int count =
        sessionManagementService.revokeAllOtherSessions(userId, Optional.of(currentRawToken));
    assertThat(count).isEqualTo(2);

    assertThat(sessionRepository.findById(currentSession.id()).orElseThrow().isActive(NOW))
        .isTrue();
    assertThat(sessionRepository.findById(other1.id()).orElseThrow().isActive(NOW)).isFalse();
    assertThat(sessionRepository.findById(other2.id()).orElseThrow().isActive(NOW)).isFalse();
  }

  @Test
  void revokesAllSessionsWhenCurrentSessionTokenMissing() {
    Session other1 =
        new Session(
            UUID.randomUUID(),
            userId,
            "hash-2",
            "csrf-2",
            NOW,
            NOW,
            NOW.plusSeconds(3600),
            Optional.empty(),
            Optional.of("Phone"));
    sessionRepository.save(other1);

    int count = sessionManagementService.revokeAllOtherSessions(userId, Optional.empty());
    assertThat(count).isEqualTo(1);
    assertThat(sessionRepository.findById(other1.id()).orElseThrow().isActive(NOW)).isFalse();
  }
}
