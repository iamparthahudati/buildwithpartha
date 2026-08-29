package tech.buildwithpartha.lifeos.focus.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummary;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionPhase;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionStatus;

class FocusTimeSummaryAdapterTests {

  @Test
  void countsOnlyCompletedSessionsAndIdentifiesUnscheduledWholeMinutes() {
    UUID userId = UUID.randomUUID();
    Instant start = Instant.parse("2026-08-25T00:00:00Z");
    Instant end = start.plus(Duration.ofDays(1));
    FocusSessionRepository repository = mock(FocusSessionRepository.class);
    FocusSession linked =
        terminal(userId, Optional.of(UUID.randomUUID()), FocusSessionStatus.COMPLETED, 30, 5);
    FocusSession unscheduled =
        terminal(userId, Optional.empty(), FocusSessionStatus.COMPLETED, 15, 2);
    FocusSession cancelled =
        terminal(userId, Optional.empty(), FocusSessionStatus.CANCELLED, 20, 0);
    given(repository.findByUserIdAndStartedAtBetween(userId, start, end))
        .willReturn(List.of(linked, unscheduled, cancelled));
    given(repository.findActiveByUserId(userId)).willReturn(Optional.empty());

    FocusTimeSummary result =
        new FocusTimeSummaryAdapter(repository).summarize(userId, start, end, end);

    assertThat(result.actualFocusMinutes()).isEqualTo(45);
    assertThat(result.actualBreakMinutes()).isEqualTo(7);
    assertThat(result.unscheduledFocusMinutes()).isEqualTo(15);
    assertThat(result.sessionActive()).isFalse();
    assertThat(result.activeSessionTimerSummary()).isNull();
  }

  @Test
  void reportsTheCanonicalRemainingTimeForAnActiveSession() {
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-25T10:10:00Z");
    FocusSessionRepository repository = mock(FocusSessionRepository.class);
    FocusSession active =
        FocusSession.start(
            UUID.randomUUID(),
            userId,
            Optional.empty(),
            Optional.empty(),
            Duration.ofMinutes(25),
            Duration.ofMinutes(5),
            now.minus(Duration.ofMinutes(10)));
    given(
            repository.findByUserIdAndStartedAtBetween(
                userId, now.minusSeconds(1), now.plusSeconds(1)))
        .willReturn(List.of());
    given(repository.findActiveByUserId(userId)).willReturn(Optional.of(active));

    FocusTimeSummary result =
        new FocusTimeSummaryAdapter(repository)
            .summarize(userId, now.minusSeconds(1), now.plusSeconds(1), now);

    assertThat(result.sessionActive()).isTrue();
    assertThat(result.activeSessionTimerSummary()).isEqualTo("15:00");
  }

  private static FocusSession terminal(
      UUID userId,
      Optional<UUID> timeBlockId,
      FocusSessionStatus status,
      long focusMinutes,
      long breakMinutes) {
    Instant startedAt = Instant.parse("2026-08-25T09:00:00Z");
    Instant endedAt = startedAt.plus(Duration.ofMinutes(focusMinutes + breakMinutes));
    return new FocusSession(
        UUID.randomUUID(),
        userId,
        Optional.empty(),
        timeBlockId,
        status,
        FocusSessionPhase.FOCUS,
        Duration.ofMinutes(25),
        Duration.ofMinutes(5),
        Duration.ofMinutes(focusMinutes),
        Duration.ofMinutes(breakMinutes),
        startedAt,
        Optional.empty(),
        Optional.empty(),
        Optional.of(endedAt),
        startedAt,
        endedAt,
        0);
  }
}
