package tech.buildwithpartha.lifeos.report.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalInt;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
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
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary.CategoryMinutes;
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary.FocusProgressSummary;
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary.GoalProgressSummary;
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary.HabitProgressSummary;
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary.ProjectProgressSummary;
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary.ReviewProgressSummary;
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary.TaskProgressSummary;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;

/** Aggregates progress metrics across LifeOS domains per Metric Dictionary 1.0.0 (LOS-1106). */
@Service
public class ProgressAggregationService {

  public static final String METRIC_DICTIONARY_VERSION = "1.0.0";
  private static final long MAX_RANGE_DAYS = 366;

  private final TaskProgressPort taskProgressPort;
  private final ProjectProgressPort projectProgressPort;
  private final GoalProgressPort goalProgressPort;
  private final ReviewProgressPort reviewProgressPort;
  private final FocusTimeSummaryProvider focusTimeSummaryProvider;
  private final TimeBlockTimeSummaryProvider timeBlockTimeSummaryProvider;
  private final DailyFocusTargetProvider dailyFocusTargetProvider;
  private final Clock clock;

  public ProgressAggregationService(
      TaskProgressPort taskProgressPort,
      ProjectProgressPort projectProgressPort,
      GoalProgressPort goalProgressPort,
      ReviewProgressPort reviewProgressPort,
      FocusTimeSummaryProvider focusTimeSummaryProvider,
      TimeBlockTimeSummaryProvider timeBlockTimeSummaryProvider,
      DailyFocusTargetProvider dailyFocusTargetProvider,
      Clock clock) {
    this.taskProgressPort = taskProgressPort;
    this.projectProgressPort = projectProgressPort;
    this.goalProgressPort = goalProgressPort;
    this.reviewProgressPort = reviewProgressPort;
    this.focusTimeSummaryProvider = focusTimeSummaryProvider;
    this.timeBlockTimeSummaryProvider = timeBlockTimeSummaryProvider;
    this.dailyFocusTargetProvider = dailyFocusTargetProvider;
    this.clock = clock;
  }

  public ProgressReportSummary getProgressReport(
      UUID userId,
      LocalDate startDateParam,
      LocalDate endDateParam,
      String timeZoneStr,
      UUID projectId,
      UUID labelId,
      String category) {

    ZoneId zoneId = parseTimeZone(timeZoneStr);
    Instant now = clock.instant();
    LocalDate today = now.atZone(zoneId).toLocalDate();

    LocalDate endDate = endDateParam != null ? endDateParam : today;
    LocalDate startDate = startDateParam != null ? startDateParam : endDate.minusDays(6);

    if (startDate.isAfter(endDate)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("startDate", "INVALID_DATE_RANGE")));
    }

    long daysInRange = ChronoUnit.DAYS.between(startDate, endDate) + 1;
    if (daysInRange > MAX_RANGE_DAYS) {
      throw new FieldValidationException(
          "Validation failed",
          List.of(new FieldProblem("startDate", "RANGE_EXCEEDS_MAXIMUM_BOUND")));
    }

    Instant rangeStart = startDate.atStartOfDay(zoneId).toInstant();
    Instant rangeEnd = endDate.plusDays(1).atStartOfDay(zoneId).toInstant();

    // 1. Tasks Progress
    TaskProgressPort.TaskProgressData taskData =
        taskProgressPort.getTaskProgress(userId, rangeStart, rangeEnd, now, projectId, labelId);

    Double taskCompletionRate =
        taskData.totalCount() > 0
            ? BigDecimal.valueOf((taskData.completedCount() * 100.0) / taskData.totalCount())
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue()
            : null;

    TaskProgressSummary taskProgress =
        new TaskProgressSummary(
            taskData.totalCount(),
            taskData.completedCount(),
            taskData.dueCount(),
            taskData.overdueCount(),
            taskData.highPriorityCount(),
            taskData.blockedCount(),
            taskCompletionRate);

    // 2. Focus & Time Progress
    FocusProgressSummary focusProgress =
        aggregateFocusProgress(userId, rangeStart, rangeEnd, now, daysInRange);

    // 3. Projects Progress
    ProjectProgressPort.ProjectProgressData projectData =
        projectProgressPort.getProjectProgress(userId, projectId, labelId);

    ProjectProgressSummary projectProgress =
        new ProjectProgressSummary(
            projectData.totalCount(),
            projectData.statusCounts(),
            projectData.averageProgressPercentage());

    // 4. Goals Progress
    GoalProgressPort.GoalProgressData goalData =
        goalProgressPort.getGoalProgress(userId, category, now);

    GoalProgressSummary goalProgress =
        new GoalProgressSummary(
            goalData.totalCount(),
            goalData.averageProgressPercentage(),
            goalData.goalsWithRecentCheckinCount());

    // 5. Habits Progress (Zero-data default until Epic 12)
    HabitProgressSummary habitProgress = new HabitProgressSummary(0, null);

    // 6. Reviews Progress
    ReviewProgressPort.ReviewProgressData reviewData =
        reviewProgressPort.getReviewProgress(userId, startDate, endDate, today);

    ReviewProgressSummary reviewProgress =
        new ReviewProgressSummary(reviewData.dailyStreakDays(), reviewData.finalizedReviewsCount());

    // 7. Factual accessible summary text (Non-causal)
    String summaryText =
        buildSummaryText(
            startDate,
            endDate,
            taskProgress,
            focusProgress,
            projectProgress,
            goalProgress,
            reviewProgress);

    return new ProgressReportSummary(
        METRIC_DICTIONARY_VERSION,
        now,
        zoneId.getId(),
        startDate,
        endDate,
        projectId,
        labelId,
        category,
        taskProgress,
        focusProgress,
        projectProgress,
        goalProgress,
        habitProgress,
        reviewProgress,
        summaryText);
  }

  private FocusProgressSummary aggregateFocusProgress(
      UUID userId, Instant rangeStart, Instant rangeEnd, Instant now, long daysInRange) {

    FocusTimeSummary focus = focusTimeSummaryProvider.summarize(userId, rangeStart, rangeEnd, now);
    TimeBlockTimeSummary blocks =
        timeBlockTimeSummaryProvider.summarize(userId, rangeStart, rangeEnd);
    OptionalInt dailyTarget = dailyFocusTargetProvider.getDailyFocusTargetMinutes(userId);

    FocusComparisonSource comparisonSource;
    Integer comparisonMinutes;

    if (blocks.plannedFocusMinutes() > 0) {
      comparisonSource = FocusComparisonSource.PLANNED_FOCUS_BLOCKS;
      comparisonMinutes = blocks.plannedFocusMinutes();
    } else if (dailyTarget.isPresent()) {
      comparisonSource = FocusComparisonSource.DAILY_TARGET;
      comparisonMinutes = Math.toIntExact(dailyTarget.getAsInt() * daysInRange);
    } else {
      comparisonSource = FocusComparisonSource.NONE;
      comparisonMinutes = null;
    }

    Double plannedVsActualRatio =
        comparisonMinutes != null && comparisonMinutes > 0
            ? BigDecimal.valueOf((focus.actualFocusMinutes() * 100.0) / comparisonMinutes)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue()
            : null;

    int totalActualFocus = focus.actualFocusMinutes();
    List<CategoryMinutes> categoryBreakdown = new ArrayList<>();
    if (totalActualFocus > 0 && !blocks.categories().isEmpty()) {
      for (TimeBlockCategoryMinutes cat : blocks.categories()) {
        double pct =
            BigDecimal.valueOf((cat.minutes() * 100.0) / totalActualFocus)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
        categoryBreakdown.add(new CategoryMinutes(cat.category(), cat.minutes(), pct));
      }
    }

    return new FocusProgressSummary(
        blocks.plannedFocusMinutes(),
        focus.actualFocusMinutes(),
        focus.actualBreakMinutes(),
        comparisonMinutes,
        comparisonSource,
        plannedVsActualRatio,
        categoryBreakdown);
  }

  private String buildSummaryText(
      LocalDate startDate,
      LocalDate endDate,
      TaskProgressSummary tasks,
      FocusProgressSummary focus,
      ProjectProgressSummary projects,
      GoalProgressSummary goals,
      ReviewProgressSummary reviews) {

    StringBuilder sb = new StringBuilder();
    sb.append("Progress summary from ")
        .append(startDate)
        .append(" to ")
        .append(endDate)
        .append(": ");

    if (tasks.totalCount() > 0) {
      sb.append(tasks.completedCount())
          .append(" of ")
          .append(tasks.totalCount())
          .append(" tasks completed (")
          .append(
              tasks.completionRatePercentage() != null
                  ? tasks.completionRatePercentage() + "%"
                  : "0.0%")
          .append(" rate). ");
    } else {
      sb.append("No tasks recorded. ");
    }

    sb.append(focus.actualFocusMinutes()).append(" focus minutes completed");
    if (focus.comparisonMinutes() != null && focus.comparisonMinutes() > 0) {
      sb.append(" (")
          .append(
              focus.plannedVsActualRatio() != null ? focus.plannedVsActualRatio() + "%" : "0.0%")
          .append(" of target). ");
    } else {
      sb.append(". ");
    }

    if (projects.totalCount() > 0) {
      sb.append("Active project progress averages ")
          .append(projects.averageProgressPercentage())
          .append("% across ")
          .append(projects.totalCount())
          .append(" projects. ");
    }

    if (goals.totalCount() > 0) {
      sb.append("Goal progress averages ")
          .append(goals.averageProgressPercentage())
          .append("% across ")
          .append(goals.totalCount())
          .append(" active goals. ");
    }

    sb.append(reviews.finalizedReviewsCount())
        .append(" reviews finalized with a ")
        .append(reviews.dailyStreakDays())
        .append("-day review streak.");

    return sb.toString();
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
