package tech.buildwithpartha.lifeos.report.application;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.OptionalInt;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.time.DailyFocusTargetProvider;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummary;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummaryProvider;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummary;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummaryProvider;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;

/** Calculates one Account's daily focus target and planned-versus-actual projection. */
@Service
public class TimeGoalService {

  private final DailyFocusTargetProvider dailyFocusTargetProvider;
  private final FocusTimeSummaryProvider focusTimeSummaryProvider;
  private final TimeBlockTimeSummaryProvider timeBlockTimeSummaryProvider;
  private final Clock clock;

  public TimeGoalService(
      DailyFocusTargetProvider dailyFocusTargetProvider,
      FocusTimeSummaryProvider focusTimeSummaryProvider,
      TimeBlockTimeSummaryProvider timeBlockTimeSummaryProvider,
      Clock clock) {
    this.dailyFocusTargetProvider = dailyFocusTargetProvider;
    this.focusTimeSummaryProvider = focusTimeSummaryProvider;
    this.timeBlockTimeSummaryProvider = timeBlockTimeSummaryProvider;
    this.clock = clock;
  }

  public DailyTimeSummary getDailySummary(UUID userId, LocalDate localDate, String timeZone) {
    ZoneId zoneId = parseTimeZone(timeZone);
    Instant rangeStart = localDate.atStartOfDay(zoneId).toInstant();
    Instant rangeEnd = localDate.plusDays(1).atStartOfDay(zoneId).toInstant();
    Instant now = clock.instant();

    FocusTimeSummary focus = focusTimeSummaryProvider.summarize(userId, rangeStart, rangeEnd, now);
    TimeBlockTimeSummary blocks =
        timeBlockTimeSummaryProvider.summarize(userId, rangeStart, rangeEnd);
    OptionalInt target = dailyFocusTargetProvider.getDailyFocusTargetMinutes(userId);

    FocusComparisonSource comparisonSource;
    Integer comparisonMinutes;
    if (blocks.plannedFocusMinutes() > 0) {
      comparisonSource = FocusComparisonSource.PLANNED_FOCUS_BLOCKS;
      comparisonMinutes = blocks.plannedFocusMinutes();
    } else if (target.isPresent()) {
      comparisonSource = FocusComparisonSource.DAILY_TARGET;
      comparisonMinutes = target.getAsInt();
    } else {
      comparisonSource = FocusComparisonSource.NONE;
      comparisonMinutes = null;
    }

    Integer progressPercentage =
        comparisonMinutes == null
            ? null
            : Math.toIntExact(Math.round((focus.actualFocusMinutes() * 100.0) / comparisonMinutes));
    List<DailyTimeSummary.CategoryMinutes> categories =
        blocks.categories().stream()
            .map(
                category ->
                    new DailyTimeSummary.CategoryMinutes(category.category(), category.minutes()))
            .toList();
    boolean hasData =
        focus.actualFocusMinutes() > 0
            || focus.actualBreakMinutes() > 0
            || blocks.plannedFocusMinutes() > 0
            || target.isPresent()
            || !categories.isEmpty()
            || focus.sessionActive();

    return new DailyTimeSummary(
        now,
        localDate,
        zoneId.getId(),
        focus.actualFocusMinutes(),
        focus.actualBreakMinutes(),
        focus.unscheduledFocusMinutes(),
        blocks.personalMinutes(),
        blocks.plannedFocusMinutes(),
        target.isPresent() ? target.getAsInt() : null,
        comparisonMinutes,
        comparisonSource,
        progressPercentage,
        focus.sessionActive(),
        focus.activeSessionTimerSummary(),
        categories,
        hasData);
  }

  private static ZoneId parseTimeZone(String timeZone) {
    try {
      return ZoneId.of(timeZone);
    } catch (Exception exception) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("timeZone", "INVALID_TIMEZONE")));
    }
  }
}
