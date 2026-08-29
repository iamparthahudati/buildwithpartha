package tech.buildwithpartha.lifeos.report.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import tech.buildwithpartha.lifeos.report.application.DailyTimeSummary;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;

/** API response for one Account-local daily time summary. */
public record DailyTimeSummaryResponse(
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
    List<CategoryMinutesResponse> categories,
    boolean hasData) {

  public static DailyTimeSummaryResponse fromSummary(DailyTimeSummary summary) {
    return new DailyTimeSummaryResponse(
        summary.generatedAt(),
        summary.localDate(),
        summary.timeZone(),
        summary.actualFocusMinutes(),
        summary.actualBreakMinutes(),
        summary.unscheduledFocusMinutes(),
        summary.personalTimeBlockMinutes(),
        summary.plannedFocusMinutes(),
        summary.dailyFocusTargetMinutes(),
        summary.comparisonMinutes(),
        summary.comparisonSource(),
        summary.progressPercentage(),
        summary.sessionActive(),
        summary.activeSessionTimerSummary(),
        summary.categories().stream()
            .map(item -> new CategoryMinutesResponse(item.category(), item.minutes()))
            .toList(),
        summary.hasData());
  }

  public record CategoryMinutesResponse(String category, int minutes) {}
}
