package tech.buildwithpartha.lifeos.focus.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruption;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaFocusSessionRepositoryTests {

  @Autowired private FocusSessionJpaRepository sessionJpaRepository;
  @Autowired private FocusSessionInterruptionJpaRepository interruptionJpaRepository;

  @Test
  void roundTripsContextClockStateAndOwnershipScopedQueries() {
    JpaFocusSessionRepository repository = new JpaFocusSessionRepository(sessionJpaRepository);
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    UUID timeBlockId = UUID.randomUUID();
    Instant start = Instant.parse("2026-08-24T09:00:00Z");
    FocusSession session =
        FocusSession.start(
                UUID.randomUUID(),
                userId,
                Optional.of(taskId),
                Optional.of(timeBlockId),
                Duration.ofMinutes(50),
                Duration.ofMinutes(10),
                start)
            .pause(start.plusSeconds(75));

    FocusSession saved = repository.save(session);
    assertThat(saved.taskId()).contains(taskId);
    assertThat(saved.timeBlockId()).contains(timeBlockId);
    assertThat(saved.actualFocusDuration()).isEqualTo(Duration.ofSeconds(75));
    assertThat(repository.findByIdAndUserId(saved.id(), userId)).contains(saved);
    assertThat(repository.findByIdAndUserId(saved.id(), UUID.randomUUID())).isEmpty();
    assertThat(repository.findActiveByUserId(userId)).contains(saved);
    assertThat(
            repository.findByUserIdAndStartedAtBetween(
                userId, start.minusSeconds(1), start.plusSeconds(1)))
        .containsExactly(saved);
    assertThat(
            repository.findByUserIdAndStartedAtBetween(
                UUID.randomUUID(), start.minusSeconds(1), start.plusSeconds(1)))
        .isEmpty();
  }

  @Test
  void interruptionQueriesAreScopedBySessionAndOwner() {
    JpaFocusSessionRepository sessionRepository =
        new JpaFocusSessionRepository(sessionJpaRepository);
    JpaFocusSessionInterruptionRepository interruptionRepository =
        new JpaFocusSessionInterruptionRepository(interruptionJpaRepository);
    UUID userId = UUID.randomUUID();
    Instant start = Instant.parse("2026-08-24T09:00:00Z");
    FocusSession session =
        sessionRepository.save(
            FocusSession.start(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                Optional.empty(),
                Duration.ofMinutes(25),
                Duration.ofMinutes(5),
                start));
    FocusSessionInterruption interruption =
        session.recordInterruption(UUID.randomUUID(), start.plusSeconds(5), "Doorbell");

    FocusSessionInterruption saved = interruptionRepository.save(interruption);
    assertThat(saved.note()).contains("Doorbell");
    assertThat(interruptionRepository.findByFocusSessionIdAndUserId(session.id(), userId))
        .containsExactly(saved);
    assertThat(
            interruptionRepository.findByFocusSessionIdAndUserId(session.id(), UUID.randomUUID()))
        .isEmpty();
  }

  @Test
  void terminalSessionIsNotReturnedAsActiveAndRangeMustBeOrdered() {
    JpaFocusSessionRepository repository = new JpaFocusSessionRepository(sessionJpaRepository);
    UUID userId = UUID.randomUUID();
    Instant start = Instant.parse("2026-08-24T09:00:00Z");
    repository.save(
        FocusSession.start(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                Optional.empty(),
                Duration.ofMinutes(25),
                Duration.ZERO,
                start)
            .complete(start.plusSeconds(25)));

    assertThat(repository.findActiveByUserId(userId)).isEmpty();
    org.assertj.core.api.Assertions.assertThatThrownBy(
            () -> repository.findByUserIdAndStartedAtBetween(userId, start, start))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
