package tech.buildwithpartha.lifeos.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.auth.domain.Session;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaSessionRepositoryTests {

  @Autowired private SessionJpaRepository jpaRepository;

  private static final Instant NOW = Instant.parse("2026-08-18T00:00:00Z");

  @Test
  void savedSessionRoundTripsWithAnUnrevokedState() {
    JpaSessionRepository repository = new JpaSessionRepository(jpaRepository);
    UUID userId = UUID.randomUUID();

    Session saved =
        repository.save(
            Session.issue(
                UUID.randomUUID(),
                userId,
                "sha256:token",
                "sha256:csrf",
                NOW,
                Optional.of("Mozilla/5.0")));
    jpaRepository.flush();

    assertThat(saved.userId()).isEqualTo(userId);
    assertThat(saved.tokenHash()).isEqualTo("sha256:token");
    assertThat(saved.csrfSecretHash()).isEqualTo("sha256:csrf");
    assertThat(saved.expiresAt()).isEqualTo(NOW.plus(Session.TTL));
    assertThat(saved.revokedAt()).isEmpty();
    assertThat(saved.deviceHint()).contains("Mozilla/5.0");

    SessionEntity reloaded = jpaRepository.findById(saved.id()).orElseThrow();
    assertThat(reloaded.getRevokedAt()).isNull();
    assertThat(reloaded.getDeviceHint()).isEqualTo("Mozilla/5.0");
  }

  @Test
  void findByTokenHashLocatesTheMatchingRowOnly() {
    JpaSessionRepository repository = new JpaSessionRepository(jpaRepository);
    repository.save(
        Session.issue(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "sha256:present",
            "sha256:csrf",
            NOW,
            Optional.empty()));
    jpaRepository.flush();

    assertThat(repository.findByTokenHash("sha256:present")).isPresent();
    assertThat(repository.findByTokenHash("sha256:absent")).isEmpty();
  }

  @Test
  void revokeSucceedsOnceAndFailsOnASecondAttemptForTheSameSession() {
    JpaSessionRepository repository = new JpaSessionRepository(jpaRepository);
    Session saved =
        repository.save(
            Session.issue(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "sha256:revoke-me",
                "sha256:csrf",
                NOW,
                Optional.empty()));
    jpaRepository.flush();

    boolean firstAttempt = repository.revoke(saved.id(), NOW.plusSeconds(60));
    jpaRepository.flush();
    boolean secondAttempt = repository.revoke(saved.id(), NOW.plusSeconds(120));

    assertThat(firstAttempt).isTrue();
    assertThat(secondAttempt).isFalse();
    assertThat(jpaRepository.findById(saved.id()).orElseThrow().getRevokedAt())
        .isEqualTo(NOW.plusSeconds(60));
  }

  @Test
  void revokeAllForUserRevokesOnlyThatUsersActiveSessions() {
    JpaSessionRepository repository = new JpaSessionRepository(jpaRepository);
    UUID userId = UUID.randomUUID();
    UUID otherUserId = UUID.randomUUID();
    Session first =
        repository.save(
            Session.issue(
                UUID.randomUUID(), userId, "sha256:first", "sha256:csrf", NOW, Optional.empty()));
    Session second =
        repository.save(
            Session.issue(
                UUID.randomUUID(), userId, "sha256:second", "sha256:csrf", NOW, Optional.empty()));
    Session othersSession =
        repository.save(
            Session.issue(
                UUID.randomUUID(),
                otherUserId,
                "sha256:others",
                "sha256:csrf",
                NOW,
                Optional.empty()));
    jpaRepository.flush();

    int revokedCount = repository.revokeAllForUser(userId, NOW.plusSeconds(60));

    assertThat(revokedCount).isEqualTo(2);
    assertThat(jpaRepository.findById(first.id()).orElseThrow().getRevokedAt()).isNotNull();
    assertThat(jpaRepository.findById(second.id()).orElseThrow().getRevokedAt()).isNotNull();
    assertThat(jpaRepository.findById(othersSession.id()).orElseThrow().getRevokedAt()).isNull();
  }
}
