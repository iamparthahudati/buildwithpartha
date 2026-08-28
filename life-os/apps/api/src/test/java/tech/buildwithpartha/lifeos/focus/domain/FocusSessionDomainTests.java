package tech.buildwithpartha.lifeos.focus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static tech.buildwithpartha.lifeos.focus.domain.FocusSessionFixture.persistedSession;
import static tech.buildwithpartha.lifeos.focus.domain.FocusSessionFixture.runningSession;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FocusSessionDomainTests {

  private static final Instant START = Instant.parse("2026-08-24T09:00:00Z");

  @Test
  void startsInRunningFocusWithServerClockAnchorAndContext() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    UUID timeBlockId = UUID.randomUUID();

    FocusSession session =
        FocusSession.start(
            id,
            userId,
            Optional.of(taskId),
            Optional.of(timeBlockId),
            Duration.ofMinutes(25),
            Duration.ofMinutes(5),
            START);

    assertThat(session.id()).isEqualTo(id);
    assertThat(session.isOwnedBy(userId)).isTrue();
    assertThat(session.isOwnedBy(UUID.randomUUID())).isFalse();
    assertThat(session.taskId()).contains(taskId);
    assertThat(session.timeBlockId()).contains(timeBlockId);
    assertThat(session.status()).isEqualTo(FocusSessionStatus.RUNNING);
    assertThat(session.phase()).isEqualTo(FocusSessionPhase.FOCUS);
    assertThat(session.phaseStartedAt()).contains(START);
    assertThat(session.actualFocusDuration()).isZero();
    assertThat(session.actualBreakDuration()).isZero();
  }

  @Test
  void pauseAndResumeAccumulateOnlyRunningTime() {
    FocusSession running = runningSession(UUID.randomUUID(), START);

    FocusSession paused = running.pause(START.plusSeconds(90));
    assertThat(paused.status()).isEqualTo(FocusSessionStatus.PAUSED);
    assertThat(paused.phaseStartedAt()).isEmpty();
    assertThat(paused.pausedAt()).contains(START.plusSeconds(90));
    assertThat(paused.actualFocusDuration()).isEqualTo(Duration.ofSeconds(90));
    assertThat(paused.actualFocusDurationAt(START.plusSeconds(500)))
        .isEqualTo(Duration.ofSeconds(90));

    FocusSession resumed = paused.resume(START.plusSeconds(150));
    assertThat(resumed.status()).isEqualTo(FocusSessionStatus.RUNNING);
    assertThat(resumed.phaseStartedAt()).contains(START.plusSeconds(150));
    assertThat(resumed.pausedAt()).isEmpty();
    assertThat(resumed.actualFocusDurationAt(START.plusSeconds(180)))
        .isEqualTo(Duration.ofSeconds(120));
  }

  @Test
  void breakTransitionsKeepFocusAndBreakDurationsSeparate() {
    FocusSession focus = runningSession(UUID.randomUUID(), START);
    FocusSession onBreak = focus.startBreak(START.plusSeconds(120));

    assertThat(onBreak.phase()).isEqualTo(FocusSessionPhase.BREAK);
    assertThat(onBreak.actualFocusDuration()).isEqualTo(Duration.ofSeconds(120));
    assertThat(onBreak.actualBreakDurationAt(START.plusSeconds(165)))
        .isEqualTo(Duration.ofSeconds(45));

    FocusSession resumedFocus = onBreak.resumeFocus(START.plusSeconds(180));
    FocusSession completed = resumedFocus.complete(START.plusSeconds(240));

    assertThat(completed.status()).isEqualTo(FocusSessionStatus.COMPLETED);
    assertThat(completed.actualFocusDuration()).isEqualTo(Duration.ofSeconds(180));
    assertThat(completed.actualBreakDuration()).isEqualTo(Duration.ofSeconds(60));
    assertThat(completed.endedAt()).contains(START.plusSeconds(240));
    assertThat(completed.phaseStartedAt()).isEmpty();
  }

  @Test
  void pausedSessionCanCompleteOrCancelWithoutCountingPause() {
    FocusSession paused = runningSession(UUID.randomUUID(), START).pause(START.plusSeconds(60));

    FocusSession completed = paused.complete(START.plusSeconds(600));
    assertThat(completed.status()).isEqualTo(FocusSessionStatus.COMPLETED);
    assertThat(completed.actualFocusDuration()).isEqualTo(Duration.ofSeconds(60));

    FocusSession cancelled =
        runningSession(UUID.randomUUID(), START)
            .pause(START.plusSeconds(30))
            .cancel(START.plusSeconds(90));
    assertThat(cancelled.status()).isEqualTo(FocusSessionStatus.CANCELLED);
    assertThat(cancelled.actualFocusDuration()).isEqualTo(Duration.ofSeconds(30));
  }

  @Test
  void interruptionBelongsToActiveSessionAndNormalizesOptionalNote() {
    FocusSession session = runningSession(UUID.randomUUID(), START);
    UUID interruptionId = UUID.randomUUID();

    FocusSessionInterruption interruption =
        session.recordInterruption(interruptionId, START.plusSeconds(10), "  Phone notification  ");
    assertThat(interruption.id()).isEqualTo(interruptionId);
    assertThat(interruption.focusSessionId()).isEqualTo(session.id());
    assertThat(interruption.userId()).isEqualTo(session.userId());
    assertThat(interruption.note()).contains("Phone notification");

    assertThat(session.recordInterruption(UUID.randomUUID(), START.plusSeconds(20), "  ").note())
        .isEmpty();
    assertThatThrownBy(
            () ->
                session
                    .complete(START.plusSeconds(30))
                    .recordInterruption(UUID.randomUUID(), START, null))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void rejectsInvalidStateShapesDurationsAndTransitionOrder() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    assertThatThrownBy(
            () ->
                FocusSession.start(
                    id,
                    userId,
                    Optional.empty(),
                    Optional.empty(),
                    Duration.ZERO,
                    Duration.ZERO,
                    START))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("plannedFocusDuration must be positive");

    assertThatThrownBy(
            () ->
                persistedSession(
                    id,
                    userId,
                    Optional.empty(),
                    Optional.empty(),
                    FocusSessionStatus.RUNNING,
                    FocusSessionPhase.FOCUS,
                    Duration.ZERO,
                    Duration.ZERO,
                    START,
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    0))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("RUNNING Focus Session");

    FocusSession session = runningSession(userId, START);
    assertThatThrownBy(() -> session.pause(START.minusSeconds(1)))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("must not move backwards");
    assertThatThrownBy(() -> session.resume(START.plusSeconds(1)))
        .isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(() -> session.resumeFocus(START.plusSeconds(1)))
        .isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(() -> session.complete(START.plusSeconds(1)).cancel(START.plusSeconds(2)))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void statusHelpersMatchCanonicalLifecycle() {
    assertThat(FocusSessionStatus.RUNNING.isActive()).isTrue();
    assertThat(FocusSessionStatus.PAUSED.isActive()).isTrue();
    assertThat(FocusSessionStatus.COMPLETED.isActive()).isFalse();
    assertThat(FocusSessionStatus.COMPLETED.isTerminal()).isTrue();
    assertThat(FocusSessionStatus.CANCELLED.isTerminal()).isTrue();
  }

  @Test
  void interruptionRejectsOversizedNoteAndInvalidClockOrder() {
    assertThatThrownBy(
            () ->
                new FocusSessionInterruption(
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    START,
                    Optional.of("x".repeat(2001)),
                    START,
                    0))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("1 to 2000");
    assertThatThrownBy(
            () ->
                new FocusSessionInterruption(
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    START.plusSeconds(1),
                    Optional.empty(),
                    START,
                    0))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("occurredAt must not be after createdAt");
  }
}
