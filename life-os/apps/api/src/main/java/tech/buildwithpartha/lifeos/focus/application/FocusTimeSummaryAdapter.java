package tech.buildwithpartha.lifeos.focus.application;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummary;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummaryProvider;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionPhase;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionStatus;

/** Ownership-scoped Focus Session totals used by calculated projections. */
@Component
public class FocusTimeSummaryAdapter implements FocusTimeSummaryProvider {

  private final FocusSessionRepository repository;

  public FocusTimeSummaryAdapter(FocusSessionRepository repository) {
    this.repository = repository;
  }

  @Override
  @Transactional(readOnly = true)
  public FocusTimeSummary summarize(
      UUID userId, Instant rangeStart, Instant rangeEnd, Instant now) {
    List<FocusSession> completed =
        repository.findByUserIdAndStartedAtBetween(userId, rangeStart, rangeEnd).stream()
            .filter(session -> session.status() == FocusSessionStatus.COMPLETED)
            .toList();

    int actualFocusMinutes =
        completed.stream().mapToInt(session -> wholeMinutes(session.actualFocusDuration())).sum();
    int actualBreakMinutes =
        completed.stream().mapToInt(session -> wholeMinutes(session.actualBreakDuration())).sum();
    int unscheduledFocusMinutes =
        completed.stream()
            .filter(session -> session.timeBlockId().isEmpty())
            .mapToInt(session -> wholeMinutes(session.actualFocusDuration()))
            .sum();

    return repository
        .findActiveByUserId(userId)
        .map(
            active ->
                new FocusTimeSummary(
                    actualFocusMinutes,
                    actualBreakMinutes,
                    unscheduledFocusMinutes,
                    true,
                    timerSummary(active, now)))
        .orElseGet(
            () ->
                new FocusTimeSummary(
                    actualFocusMinutes, actualBreakMinutes, unscheduledFocusMinutes, false, null));
  }

  private static int wholeMinutes(Duration duration) {
    return Math.toIntExact(duration.toMinutes());
  }

  private static String timerSummary(FocusSession session, Instant now) {
    Duration planned =
        session.phase() == FocusSessionPhase.FOCUS
            ? session.plannedFocusDuration()
            : session.plannedBreakDuration();
    Duration actual =
        session.phase() == FocusSessionPhase.FOCUS
            ? session.actualFocusDurationAt(now)
            : session.actualBreakDurationAt(now);
    long remainingSeconds = Math.max(0L, planned.minus(actual).toSeconds());
    long minutes = remainingSeconds / 60;
    long seconds = remainingSeconds % 60;
    return "%d:%02d".formatted(minutes, seconds);
  }
}
