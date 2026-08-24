package tech.buildwithpartha.lifeos.report.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;

/** Explainable daily planned-versus-actual time projection. */
public record DailyTimeSummary(
    Instant generatedAt,
    LocalDate localDate,
    String timeZone,
    int actualFocusMinutes,
    int actualBreakMinutes,
    int unscheduledFocusMinutes,
    int personalTimeBlockMinutes,
    int plannedFocusMinutes,
    Integer dailyFocusTargetMinutes,
    Integer comparisonMinutes,
    FocusComparisonSource comparisonSource,
    Integer progressPercentage,
    boolean sessionActive,
    String activeSessionTimerSummary,
    List<CategoryMinutes> categories,
    boolean hasData) {

  public DailyTimeSummary {
    Objects.requireNonNull(generatedAt, "generatedAt must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");
    Objects.requireNonNull(timeZone, "timeZone must not be null");
    Objects.requireNonNull(comparisonSource, "comparisonSource must not be null");
    Objects.requireNonNull(categories, "categories must not be null");
    categories = List.copyOf(categories);
  }

  public record CategoryMinutes(String category, int minutes) {}
}
