package tech.buildwithpartha.lifeos.report.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.progress.GoalProgressPort;
import tech.buildwithpartha.lifeos.common.progress.ProjectProgressPort;
import tech.buildwithpartha.lifeos.common.progress.ReviewProgressPort;
import tech.buildwithpartha.lifeos.common.progress.TaskProgressPort;
import tech.buildwithpartha.lifeos.common.time.DailyFocusTargetProvider;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummary;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummaryProvider;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummary;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummaryProvider;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;

@ExtendWith(MockitoExtension.class)
class ProgressAggregationServiceTests {

  @Mock private TaskProgressPort taskProgressPort;
  @Mock private ProjectProgressPort projectProgressPort;
  @Mock private GoalProgressPort goalProgressPort;
  @Mock private ReviewProgressPort reviewProgressPort;
  @Mock private FocusTimeSummaryProvider focusTimeSummaryProvider;
  @Mock private TimeBlockTimeSummaryProvider timeBlockTimeSummaryProvider;
  @Mock private DailyFocusTargetProvider dailyFocusTargetProvider;

  private Clock fixedClock;
  private ProgressAggregationService service;
  private UUID userId;

  @BeforeEach
  void setUp() {
    Instant now = Instant.parse("2026-08-26T10:00:00Z");
    fixedClock = Clock.fixed(now, ZoneId.of("UTC"));
    userId = UUID.randomUUID();

    service =
        new ProgressAggregationService(
            taskProgressPort,
            projectProgressPort,
            goalProgressPort,
            reviewProgressPort,
            focusTimeSummaryProvider,
            timeBlockTimeSummaryProvider,
            dailyFocusTargetProvider,
            fixedClock);
  }

  @Test
  void throwsOnInvalidTimezone() {
    assertThrows(
        FieldValidationException.class,
        () -> service.getProgressReport(userId, null, null, "Invalid/TimeZone", null, null, null));
  }

  @Test
  void throwsOnInvalidDateRange() {
    LocalDate startDate = LocalDate.of(2026, 8, 25);
    LocalDate endDate = LocalDate.of(2026, 8, 20);

    assertThrows(
        FieldValidationException.class,
        () -> service.getProgressReport(userId, startDate, endDate, "UTC", null, null, null));
  }

  @Test
  void throwsOnDateRangeExceedingMaxBound() {
    LocalDate startDate = LocalDate.of(2025, 1, 1);
    LocalDate endDate = LocalDate.of(2026, 8, 26);

    assertThrows(
        FieldValidationException.class,
        () -> service.getProgressReport(userId, startDate, endDate, "UTC", null, null, null));
  }

  @Test
  void calculatesZeroDataAggregationCorrectly() {
    when(taskProgressPort.getTaskProgress(any(), any(), any(), any(), any(), any()))
        .thenReturn(new TaskProgressPort.TaskProgressData(0, 0, 0, 0, 0, 0));
    when(projectProgressPort.getProjectProgress(any(), any(), any()))
        .thenReturn(new ProjectProgressPort.ProjectProgressData(0, Map.of(), 0.0));
    when(goalProgressPort.getGoalProgress(any(), any(), any()))
        .thenReturn(new GoalProgressPort.GoalProgressData(0, 0.0, 0));
    when(reviewProgressPort.getReviewProgress(any(), any(), any(), any()))
        .thenReturn(new ReviewProgressPort.ReviewProgressData(0, 0));

    when(focusTimeSummaryProvider.summarize(eq(userId), any(), any(), any()))
        .thenReturn(new FocusTimeSummary(0, 0, 0, false, null));
    when(timeBlockTimeSummaryProvider.summarize(eq(userId), any(), any()))
        .thenReturn(new TimeBlockTimeSummary(0, 0, List.of()));
    when(dailyFocusTargetProvider.getDailyFocusTargetMinutes(userId))
        .thenReturn(OptionalInt.empty());

    ProgressReportSummary report =
        service.getProgressReport(userId, null, null, "UTC", null, null, null);

    assertNotNull(report);
    assertEquals("1.0.0", report.metricDictionaryVersion());
    assertEquals(0, report.taskProgress().totalCount());
    assertNull(report.taskProgress().completionRatePercentage());
    assertEquals(0, report.focusProgress().actualFocusMinutes());
    assertEquals(FocusComparisonSource.NONE, report.focusProgress().comparisonSource());
    assertNull(report.focusProgress().plannedVsActualRatio());
    assertEquals(0, report.projectProgress().totalCount());
    assertEquals(0, report.goalProgress().totalCount());
    assertEquals(0, report.habitProgress().totalCount());
    assertNull(report.habitProgress().completionRatePercentage());
    assertEquals(0, report.reviewProgress().dailyStreakDays());
    assertTrue(report.summaryText().contains("No tasks recorded"));
  }

  @Test
  void calculatesPopulatedProgressAggregationCorrectly() {
    when(taskProgressPort.getTaskProgress(any(), any(), any(), any(), any(), any()))
        .thenReturn(new TaskProgressPort.TaskProgressData(2, 1, 0, 0, 1, 0));
    when(projectProgressPort.getProjectProgress(any(), any(), any()))
        .thenReturn(new ProjectProgressPort.ProjectProgressData(1, Map.of("ACTIVE", 1), 50.0));
    when(goalProgressPort.getGoalProgress(any(), any(), any()))
        .thenReturn(new GoalProgressPort.GoalProgressData(1, 50.0, 0));
    when(reviewProgressPort.getReviewProgress(any(), any(), any(), any()))
        .thenReturn(new ReviewProgressPort.ReviewProgressData(0, 0));

    when(focusTimeSummaryProvider.summarize(eq(userId), any(), any(), any()))
        .thenReturn(new FocusTimeSummary(120, 15, 0, false, null));
    when(timeBlockTimeSummaryProvider.summarize(eq(userId), any(), any()))
        .thenReturn(new TimeBlockTimeSummary(120, 0, List.of()));
    when(dailyFocusTargetProvider.getDailyFocusTargetMinutes(userId))
        .thenReturn(OptionalInt.of(120));

    ProgressReportSummary report =
        service.getProgressReport(
            userId, LocalDate.of(2026, 8, 20), LocalDate.of(2026, 8, 26), "UTC", null, null, null);

    assertNotNull(report);
    assertEquals(2, report.taskProgress().totalCount());
    assertEquals(1, report.taskProgress().completedCount());
    assertEquals(50.0, report.taskProgress().completionRatePercentage());
    assertEquals(120, report.focusProgress().actualFocusMinutes());
    assertEquals(100.0, report.focusProgress().plannedVsActualRatio());
    assertEquals(1, report.projectProgress().totalCount());
    assertEquals(50.0, report.projectProgress().averageProgressPercentage());
    assertEquals(1, report.goalProgress().totalCount());
    assertEquals(50.0, report.goalProgress().averageProgressPercentage());
    assertTrue(report.summaryText().contains("1 of 2 tasks completed (50.0% rate)"));
  }
}
