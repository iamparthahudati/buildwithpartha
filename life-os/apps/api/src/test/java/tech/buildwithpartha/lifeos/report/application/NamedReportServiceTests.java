package tech.buildwithpartha.lifeos.report.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.progress.GoalProgressPort;
import tech.buildwithpartha.lifeos.common.progress.ProjectProgressPort;
import tech.buildwithpartha.lifeos.common.progress.ReviewProgressPort;
import tech.buildwithpartha.lifeos.common.progress.TaskProgressPort;
import tech.buildwithpartha.lifeos.common.time.DailyFocusTargetProvider;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummary;
import tech.buildwithpartha.lifeos.common.time.FocusTimeSummaryProvider;
import tech.buildwithpartha.lifeos.common.time.TimeBlockCategoryMinutes;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummary;
import tech.buildwithpartha.lifeos.common.time.TimeBlockTimeSummaryProvider;
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;

class NamedReportServiceTests {

  private TaskProgressPort taskProgressPort;
  private ProjectProgressPort projectProgressPort;
  private GoalProgressPort goalProgressPort;
  private ReviewProgressPort reviewProgressPort;
  private FocusTimeSummaryProvider focusTimeSummaryProvider;
  private TimeBlockTimeSummaryProvider timeBlockTimeSummaryProvider;
  private DailyFocusTargetProvider dailyFocusTargetProvider;
  private ProgressAggregationService progressAggregationService;
  private Clock clock;
  private NamedReportService service;

  private final UUID userId = UUID.randomUUID();
  private final Instant fixedInstant = Instant.parse("2026-08-27T12:00:00Z");

  @BeforeEach
  void setUp() {
    clock = Clock.fixed(fixedInstant, ZoneId.of("UTC"));

    taskProgressPort =
        (u, start, end, now, proj, label) ->
            new TaskProgressPort.TaskProgressData(10, 8, 2, 0, 3, 1);

    projectProgressPort =
        (u, proj, label) ->
            new ProjectProgressPort.ProjectProgressData(
                5, Map.of("IN_PROGRESS", 3, "COMPLETED", 2), 75.0);

    goalProgressPort = (u, cat, now) -> new GoalProgressPort.GoalProgressData(3, 80.0, 3);

    reviewProgressPort = (u, start, end, today) -> new ReviewProgressPort.ReviewProgressData(7, 5);

    focusTimeSummaryProvider =
        (u, start, end, now) -> new FocusTimeSummary(240, 30, 0, false, null);

    timeBlockTimeSummaryProvider =
        (u, start, end) ->
            new TimeBlockTimeSummary(300, 0, List.of(new TimeBlockCategoryMinutes("FOCUS", 240)));

    dailyFocusTargetProvider = u -> OptionalInt.of(60);

    progressAggregationService =
        new ProgressAggregationService(
            taskProgressPort,
            projectProgressPort,
            goalProgressPort,
            reviewProgressPort,
            focusTimeSummaryProvider,
            timeBlockTimeSummaryProvider,
            dailyFocusTargetProvider,
            clock);

    service =
        new NamedReportService(
            taskProgressPort,
            projectProgressPort,
            goalProgressPort,
            reviewProgressPort,
            focusTimeSummaryProvider,
            timeBlockTimeSummaryProvider,
            dailyFocusTargetProvider,
            progressAggregationService,
            clock);
  }

  @Test
  void listsAllDefinitions() {
    List<ReportDefinition> definitions = service.getDefinitions();
    assertThat(definitions).hasSize(6);
  }

  @Test
  void getsDefinitionByType() {
    ReportDefinition def = service.getDefinition(NamedReportType.TASK_COMPLETION);
    assertThat(def.reportType()).isEqualTo(NamedReportType.TASK_COMPLETION);
    assertThat(def.name()).contains("Task Completion");
    assertThat(def.asyncThresholdDays()).isEqualTo(90);
  }

  @Test
  void throwsOnInvalidDefinitionType() {
    assertThatThrownBy(() -> service.getDefinition(null))
        .isInstanceOf(FieldValidationException.class);
  }

  @Test
  void validatesInvalidTimezone() {
    assertThatThrownBy(
            () ->
                service.generateReport(
                    userId,
                    NamedReportType.TASK_COMPLETION,
                    null,
                    null,
                    "Invalid/Zone",
                    null,
                    null,
                    null))
        .isInstanceOf(FieldValidationException.class)
        .hasMessageContaining("Validation failed");
  }

  @Test
  void validatesInvalidDateRange() {
    LocalDate start = LocalDate.of(2026, 8, 25);
    LocalDate end = LocalDate.of(2026, 8, 20);

    assertThatThrownBy(
            () ->
                service.generateReport(
                    userId, NamedReportType.TASK_COMPLETION, start, end, "UTC", null, null, null))
        .isInstanceOf(FieldValidationException.class)
        .hasMessageContaining("Validation failed");
  }

  @Test
  void validatesMaximumDateRangeExceeded() {
    LocalDate start = LocalDate.of(2025, 1, 1);
    LocalDate end = LocalDate.of(2026, 8, 25);

    assertThatThrownBy(
            () ->
                service.generateReport(
                    userId, NamedReportType.TASK_COMPLETION, start, end, "UTC", null, null, null))
        .isInstanceOf(FieldValidationException.class)
        .hasMessageContaining("Validation failed");
  }

  @Test
  void generatesTaskCompletionReportWithHighCompletionRate() {
    NamedReportResult result =
        service.generateReport(
            userId, NamedReportType.TASK_COMPLETION, null, null, "UTC", null, null, null);

    assertThat(result.reportType()).isEqualTo(NamedReportType.TASK_COMPLETION);
    assertThat(result.metricDictionaryVersion()).isEqualTo("1.0.0");
    assertThat(result.metrics()).isNotEmpty();
    assertThat(result.tables()).isNotEmpty();
    assertThat(result.chartSeries()).isNotEmpty();
    assertThat(result.isAsynchronous()).isFalse();
    assertThat(result.status()).isEqualTo("COMPLETED");
  }

  @Test
  void generatesTaskCompletionReportWithLowCompletionRateAndOverdueTasks() {
    TaskProgressPort lowTaskPort =
        (u, start, end, now, proj, label) ->
            new TaskProgressPort.TaskProgressData(10, 4, 3, 3, 2, 1);

    NamedReportService customService =
        new NamedReportService(
            lowTaskPort,
            projectProgressPort,
            goalProgressPort,
            reviewProgressPort,
            focusTimeSummaryProvider,
            timeBlockTimeSummaryProvider,
            dailyFocusTargetProvider,
            progressAggregationService,
            clock);

    NamedReportResult result =
        customService.generateReport(
            userId, NamedReportType.TASK_COMPLETION, null, null, "UTC", null, null, null);

    assertThat(result.metrics())
        .anyMatch(
            m -> m.key().equals("TASK_COMPLETION_RATE") && m.status().equals("NEEDS_IMPROVEMENT"));
    assertThat(result.metrics())
        .anyMatch(m -> m.key().equals("TASK_OVERDUE_COUNT") && m.status().equals("WARNING"));
  }

  @Test
  void generatesTaskCompletionReportWithZeroTasks() {
    TaskProgressPort zeroTaskPort =
        (u, start, end, now, proj, label) ->
            new TaskProgressPort.TaskProgressData(0, 0, 0, 0, 0, 0);

    NamedReportService customService =
        new NamedReportService(
            zeroTaskPort,
            projectProgressPort,
            goalProgressPort,
            reviewProgressPort,
            focusTimeSummaryProvider,
            timeBlockTimeSummaryProvider,
            dailyFocusTargetProvider,
            progressAggregationService,
            clock);

    NamedReportResult result =
        customService.generateReport(
            userId, NamedReportType.TASK_COMPLETION, null, null, "UTC", null, null, null);

    assertThat(result.summaryText()).contains("No tasks recorded");
  }

  @Test
  void generatesTimeAllocationReportWithCategories() {
    NamedReportResult result =
        service.generateReport(
            userId, NamedReportType.TIME_ALLOCATION, null, null, "UTC", null, null, null);

    assertThat(result.reportType()).isEqualTo(NamedReportType.TIME_ALLOCATION);
    assertThat(result.metrics()).isNotEmpty();
    assertThat(result.tables()).isNotEmpty();
  }

  @Test
  void generatesTimeAllocationReportWithoutCategories() {
    TimeBlockTimeSummaryProvider emptyCategoryProvider =
        (u, start, end) -> new TimeBlockTimeSummary(0, 0, List.of());

    NamedReportService customService =
        new NamedReportService(
            taskProgressPort,
            projectProgressPort,
            goalProgressPort,
            reviewProgressPort,
            focusTimeSummaryProvider,
            emptyCategoryProvider,
            dailyFocusTargetProvider,
            progressAggregationService,
            clock);

    NamedReportResult result =
        customService.generateReport(
            userId, NamedReportType.TIME_ALLOCATION, null, null, "UTC", null, null, null);

    assertThat(result.tables()).isNotEmpty();
  }

  @Test
  void generatesProjectProgressReport() {
    NamedReportResult result =
        service.generateReport(
            userId, NamedReportType.PROJECT_PROGRESS, null, null, "UTC", null, null, null);

    assertThat(result.reportType()).isEqualTo(NamedReportType.PROJECT_PROGRESS);
    assertThat(result.metrics()).isNotEmpty();
    assertThat(result.tables()).isNotEmpty();
  }

  @Test
  void generatesProjectProgressReportWithNullAverage() {
    ProjectProgressPort nullAvgPort =
        (u, proj, label) -> new ProjectProgressPort.ProjectProgressData(0, Map.of(), null);

    NamedReportService customService =
        new NamedReportService(
            taskProgressPort,
            nullAvgPort,
            goalProgressPort,
            reviewProgressPort,
            focusTimeSummaryProvider,
            timeBlockTimeSummaryProvider,
            dailyFocusTargetProvider,
            progressAggregationService,
            clock);

    NamedReportResult result =
        customService.generateReport(
            userId, NamedReportType.PROJECT_PROGRESS, null, null, "UTC", null, null, null);

    assertThat(result.metrics()).isNotEmpty();
  }

  @Test
  void generatesGoalExecutionReport() {
    NamedReportResult result =
        service.generateReport(
            userId, NamedReportType.GOAL_EXECUTION, null, null, "UTC", null, null, null);

    assertThat(result.reportType()).isEqualTo(NamedReportType.GOAL_EXECUTION);
    assertThat(result.metrics()).isNotEmpty();
  }

  @Test
  void generatesGoalExecutionReportWithIncompleteCheckIns() {
    GoalProgressPort partialGoalPort =
        (u, cat, now) -> new GoalProgressPort.GoalProgressData(3, 50.0, 1);

    NamedReportService customService =
        new NamedReportService(
            taskProgressPort,
            projectProgressPort,
            partialGoalPort,
            reviewProgressPort,
            focusTimeSummaryProvider,
            timeBlockTimeSummaryProvider,
            dailyFocusTargetProvider,
            progressAggregationService,
            clock);

    NamedReportResult result =
        customService.generateReport(
            userId, NamedReportType.GOAL_EXECUTION, null, null, "UTC", null, null, null);

    assertThat(result.metrics())
        .anyMatch(
            m ->
                m.key().equals("GOAL_CHECKIN_RECENT_COUNT")
                    && m.status().equals("NEEDS_IMPROVEMENT"));
  }

  @Test
  void generatesReviewRitualsReport() {
    NamedReportResult result =
        service.generateReport(
            userId, NamedReportType.REVIEW_RITUALS, null, null, "UTC", null, null, null);

    assertThat(result.reportType()).isEqualTo(NamedReportType.REVIEW_RITUALS);
    assertThat(result.metrics()).isNotEmpty();
  }

  @Test
  void generatesComprehensiveProgressReport() {
    NamedReportResult result =
        service.generateReport(
            userId, NamedReportType.COMPREHENSIVE_PROGRESS, null, null, "UTC", null, null, null);

    assertThat(result.reportType()).isEqualTo(NamedReportType.COMPREHENSIVE_PROGRESS);
    assertThat(result.metrics()).isNotEmpty();
  }

  @Test
  void determinesAsynchronousThreshold() {
    LocalDate today = LocalDate.of(2026, 8, 27);
    LocalDate start = today.minusDays(100); // 101 days range > 90 threshold

    NamedReportResult result =
        service.generateReport(
            userId, NamedReportType.TASK_COMPLETION, start, today, "UTC", null, null, null);

    assertThat(result.isAsynchronous()).isTrue();
    assertThat(result.jobId()).isNotNull().startsWith("job-");
    assertThat(result.status()).isEqualTo("QUEUED");
  }
}
