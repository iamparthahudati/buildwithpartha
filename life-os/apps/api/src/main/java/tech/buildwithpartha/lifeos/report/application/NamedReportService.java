package tech.buildwithpartha.lifeos.report.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
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
import tech.buildwithpartha.lifeos.report.domain.NamedReportType;
import tech.buildwithpartha.lifeos.report.domain.ReportCategory;
import tech.buildwithpartha.lifeos.report.domain.ReportChartType;

/** Service for named report definitions and report generation (LOS-1109). */
@Service
public class NamedReportService {

  public static final String METRIC_DICTIONARY_VERSION = "1.0.0";
  private static final long MAX_RANGE_DAYS = 366;

  private static final Map<NamedReportType, ReportDefinition> DEFINITIONS =
      new EnumMap<>(NamedReportType.class);

  static {
    DEFINITIONS.put(
        NamedReportType.TASK_COMPLETION,
        new ReportDefinition(
            NamedReportType.TASK_COMPLETION,
            "Task Completion & Productivity Report",
            "Detailed analysis of task completion rates, overdue status, priority distribution, and"
                + " execution trends.",
            ReportCategory.TASKS,
            List.of("timeZone", "startDate", "endDate", "projectId", "labelId"),
            7,
            90));
    DEFINITIONS.put(
        NamedReportType.TIME_ALLOCATION,
        new ReportDefinition(
            NamedReportType.TIME_ALLOCATION,
            "Time Allocation & Focus Report",
            "Breakdown of focus session execution, break time ratio, and category time allocation.",
            ReportCategory.TIME,
            List.of("timeZone", "startDate", "endDate"),
            7,
            90));
    DEFINITIONS.put(
        NamedReportType.PROJECT_PROGRESS,
        new ReportDefinition(
            NamedReportType.PROJECT_PROGRESS,
            "Project & Milestone Status Report",
            "Overview of project statuses, milestone completions, and average project progress.",
            ReportCategory.PROJECTS,
            List.of("timeZone", "projectId", "labelId"),
            30,
            90));
    DEFINITIONS.put(
        NamedReportType.GOAL_EXECUTION,
        new ReportDefinition(
            NamedReportType.GOAL_EXECUTION,
            "Goal Execution & Check-In Report",
            "Tracking of goal progress percentages, check-in history, and category breakdowns.",
            ReportCategory.GOALS,
            List.of("timeZone", "category"),
            30,
            90));
    DEFINITIONS.put(
        NamedReportType.REVIEW_RITUALS,
        new ReportDefinition(
            NamedReportType.REVIEW_RITUALS,
            "Review Rituals & Consistency Report",
            "Review completion streaks, finalized review counts, and snapshot metrics.",
            ReportCategory.REVIEWS,
            List.of("timeZone", "startDate", "endDate"),
            30,
            90));
    DEFINITIONS.put(
        NamedReportType.COMPREHENSIVE_PROGRESS,
        new ReportDefinition(
            NamedReportType.COMPREHENSIVE_PROGRESS,
            "Comprehensive Progress & Analytics Report",
            "Cross-domain executive summary covering tasks, focus time, projects, goals, and review"
                + " rituals.",
            ReportCategory.ANALYTICS,
            List.of("timeZone", "startDate", "endDate", "projectId", "labelId", "category"),
            7,
            90));
  }

  private final TaskProgressPort taskProgressPort;
  private final ProjectProgressPort projectProgressPort;
  private final GoalProgressPort goalProgressPort;
  private final ReviewProgressPort reviewProgressPort;
  private final FocusTimeSummaryProvider focusTimeSummaryProvider;
  private final TimeBlockTimeSummaryProvider timeBlockTimeSummaryProvider;
  private final ProgressAggregationService progressAggregationService;
  private final Clock clock;

  public NamedReportService(
      TaskProgressPort taskProgressPort,
      ProjectProgressPort projectProgressPort,
      GoalProgressPort goalProgressPort,
      ReviewProgressPort reviewProgressPort,
      FocusTimeSummaryProvider focusTimeSummaryProvider,
      TimeBlockTimeSummaryProvider timeBlockTimeSummaryProvider,
      DailyFocusTargetProvider dailyFocusTargetProvider,
      ProgressAggregationService progressAggregationService,
      Clock clock) {
    this.taskProgressPort = taskProgressPort;
    this.projectProgressPort = projectProgressPort;
    this.goalProgressPort = goalProgressPort;
    this.reviewProgressPort = reviewProgressPort;
    this.focusTimeSummaryProvider = focusTimeSummaryProvider;
    this.timeBlockTimeSummaryProvider = timeBlockTimeSummaryProvider;
    this.progressAggregationService = progressAggregationService;
    this.clock = clock;
  }

  public List<ReportDefinition> getDefinitions() {
    return List.copyOf(DEFINITIONS.values());
  }

  public ReportDefinition getDefinition(NamedReportType reportType) {
    ReportDefinition def = DEFINITIONS.get(reportType);
    if (def == null) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("reportType", "INVALID_REPORT_TYPE")));
    }
    return def;
  }

  public NamedReportResult generateReport(
      UUID userId,
      NamedReportType reportType,
      LocalDate startDateParam,
      LocalDate endDateParam,
      String timeZoneStr,
      UUID projectId,
      UUID labelId,
      String category) {

    ReportDefinition definition = getDefinition(reportType);
    ZoneId zoneId = parseTimeZone(timeZoneStr);
    Instant now = clock.instant();
    LocalDate today = now.atZone(zoneId).toLocalDate();

    LocalDate endDate = endDateParam != null ? endDateParam : today;
    LocalDate startDate =
        startDateParam != null
            ? startDateParam
            : endDate.minusDays(definition.defaultTimeframeDays() - 1);

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

    boolean isAsync = daysInRange > definition.asyncThresholdDays();
    String jobId =
        isAsync
            ? "job-"
                + UUID.nameUUIDFromBytes(
                    (userId + ":" + reportType + ":" + startDate + ":" + endDate).getBytes())
            : null;
    String status = isAsync ? "QUEUED" : "COMPLETED";

    Instant rangeStart = startDate.atStartOfDay(zoneId).toInstant();
    Instant rangeEnd = endDate.plusDays(1).atStartOfDay(zoneId).toInstant();

    List<ReportMetric> metrics = new ArrayList<>();
    List<ReportTableData> tables = new ArrayList<>();
    List<ReportChartSeriesData> chartSeries = new ArrayList<>();

    // 1. Task Progress Data
    TaskProgressPort.TaskProgressData taskData =
        taskProgressPort.getTaskProgress(userId, rangeStart, rangeEnd, now, projectId, labelId);

    Double taskCompletionRate =
        taskData.totalCount() > 0
            ? BigDecimal.valueOf((taskData.completedCount() * 100.0) / taskData.totalCount())
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue()
            : null;

    // 2. Focus Time Data
    FocusTimeSummary focus = focusTimeSummaryProvider.summarize(userId, rangeStart, rangeEnd, now);
    TimeBlockTimeSummary blocks =
        timeBlockTimeSummaryProvider.summarize(userId, rangeStart, rangeEnd);

    // 3. Project Progress Data
    ProjectProgressPort.ProjectProgressData projectData =
        projectProgressPort.getProjectProgress(userId, projectId, labelId);

    // 4. Goal Progress Data
    GoalProgressPort.GoalProgressData goalData =
        goalProgressPort.getGoalProgress(userId, category, now);

    // 5. Review Progress Data
    ReviewProgressPort.ReviewProgressData reviewData =
        reviewProgressPort.getReviewProgress(userId, startDate, endDate, today);

    // Build report-specific content
    switch (reportType) {
      case TASK_COMPLETION -> {
        metrics.add(
            new ReportMetric(
                "TASK_TOTAL_COUNT",
                "Total Tasks",
                String.valueOf(taskData.totalCount()),
                (double) taskData.totalCount(),
                "tasks",
                null,
                "OK"));
        metrics.add(
            new ReportMetric(
                "TASK_COMPLETED_COUNT",
                "Completed Tasks",
                String.valueOf(taskData.completedCount()),
                (double) taskData.completedCount(),
                "tasks",
                null,
                "OK"));
        metrics.add(
            new ReportMetric(
                "TASK_COMPLETION_RATE",
                "Completion Rate",
                taskCompletionRate != null ? taskCompletionRate + "%" : "N/A",
                taskCompletionRate,
                "%",
                "100%",
                taskCompletionRate != null && taskCompletionRate >= 80.0
                    ? "GOOD"
                    : "NEEDS_IMPROVEMENT"));
        metrics.add(
            new ReportMetric(
                "TASK_OVERDUE_COUNT",
                "Overdue Tasks",
                String.valueOf(taskData.overdueCount()),
                (double) taskData.overdueCount(),
                "tasks",
                "0",
                taskData.overdueCount() == 0 ? "GOOD" : "WARNING"));
        metrics.add(
            new ReportMetric(
                "TASK_HIGH_PRIORITY_COUNT",
                "High Priority Tasks",
                String.valueOf(taskData.highPriorityCount()),
                (double) taskData.highPriorityCount(),
                "tasks",
                null,
                "OK"));

        tables.add(
            new ReportTableData(
                "task-status-breakdown",
                "Task Status Breakdown",
                "Summary of tasks by current status and priority.",
                List.of("Metric", "Count", "Percentage"),
                List.of(
                    List.of("Total Tasks", taskData.totalCount(), "100.0%"),
                    List.of(
                        "Completed Tasks",
                        taskData.completedCount(),
                        taskCompletionRate != null ? taskCompletionRate + "%" : "0.0%"),
                    List.of("Due Tasks", taskData.dueCount(), "-"),
                    List.of("Overdue Tasks", taskData.overdueCount(), "-"),
                    List.of("High Priority (P0/P1)", taskData.highPriorityCount(), "-"),
                    List.of("Blocked Tasks", taskData.blockedCount(), "-")),
                6));

        chartSeries.add(
            new ReportChartSeriesData(
                "task-execution-chart",
                "Task Distribution",
                ReportChartType.BAR,
                "Status Category",
                "Count",
                List.of(
                    new ReportDataPointValue(
                        "Completed",
                        (double) taskData.completedCount(),
                        "TASKS",
                        endDate.toString()),
                    new ReportDataPointValue(
                        "Due", (double) taskData.dueCount(), "TASKS", endDate.toString()),
                    new ReportDataPointValue(
                        "Overdue", (double) taskData.overdueCount(), "TASKS", endDate.toString()),
                    new ReportDataPointValue(
                        "High Priority",
                        (double) taskData.highPriorityCount(),
                        "TASKS",
                        endDate.toString()),
                    new ReportDataPointValue(
                        "Blocked",
                        (double) taskData.blockedCount(),
                        "TASKS",
                        endDate.toString()))));
      }
      case TIME_ALLOCATION -> {
        metrics.add(
            new ReportMetric(
                "FOCUS_ACTUAL_MINUTES",
                "Completed Focus Time",
                focus.actualFocusMinutes() + " mins",
                (double) focus.actualFocusMinutes(),
                "minutes",
                null,
                "OK"));
        metrics.add(
            new ReportMetric(
                "FOCUS_PLANNED_MINUTES",
                "Planned Focus Time",
                blocks.plannedFocusMinutes() + " mins",
                (double) blocks.plannedFocusMinutes(),
                "minutes",
                null,
                "OK"));
        metrics.add(
            new ReportMetric(
                "FOCUS_BREAK_MINUTES",
                "Break Time",
                focus.actualBreakMinutes() + " mins",
                (double) focus.actualBreakMinutes(),
                "minutes",
                null,
                "OK"));

        List<List<Object>> categoryRows = new ArrayList<>();
        List<ReportDataPointValue> categoryDataPoints = new ArrayList<>();
        if (!blocks.categories().isEmpty()) {
          for (TimeBlockCategoryMinutes cat : blocks.categories()) {
            double pct =
                focus.actualFocusMinutes() > 0
                    ? BigDecimal.valueOf((cat.minutes() * 100.0) / focus.actualFocusMinutes())
                        .setScale(1, RoundingMode.HALF_UP)
                        .doubleValue()
                    : 0.0;
            categoryRows.add(List.of(cat.category(), cat.minutes() + " mins", pct + "%"));
            categoryDataPoints.add(
                new ReportDataPointValue(
                    cat.category(), (double) cat.minutes(), cat.category(), endDate.toString()));
          }
        } else {
          categoryRows.add(
              List.of("Uncategorized", focus.actualFocusMinutes() + " mins", "100.0%"));
          categoryDataPoints.add(
              new ReportDataPointValue(
                  "Focus", (double) focus.actualFocusMinutes(), "FOCUS", endDate.toString()));
        }

        tables.add(
            new ReportTableData(
                "time-category-breakdown",
                "Category Allocation Breakdown",
                "Distribution of focus time across categories.",
                List.of("Category", "Duration", "Percentage"),
                categoryRows,
                categoryRows.size()));

        chartSeries.add(
            new ReportChartSeriesData(
                "time-category-chart",
                "Focus Time Category Distribution",
                ReportChartType.DONUT,
                "Category",
                "Minutes",
                categoryDataPoints));
      }
      case PROJECT_PROGRESS -> {
        metrics.add(
            new ReportMetric(
                "PROJECT_TOTAL_COUNT",
                "Total Projects",
                String.valueOf(projectData.totalCount()),
                (double) projectData.totalCount(),
                "projects",
                null,
                "OK"));
        metrics.add(
            new ReportMetric(
                "PROJECT_AVG_PROGRESS",
                "Average Project Progress",
                projectData.averageProgressPercentage() != null
                    ? projectData.averageProgressPercentage() + "%"
                    : "0.0%",
                projectData.averageProgressPercentage() != null
                    ? projectData.averageProgressPercentage()
                    : 0.0,
                "%",
                "100%",
                "OK"));

        List<List<Object>> statusRows = new ArrayList<>();
        List<ReportDataPointValue> statusPoints = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : projectData.statusCounts().entrySet()) {
          statusRows.add(List.of(entry.getKey(), entry.getValue()));
          statusPoints.add(
              new ReportDataPointValue(
                  entry.getKey(), (double) entry.getValue(), "PROJECTS", endDate.toString()));
        }

        tables.add(
            new ReportTableData(
                "project-status-table",
                "Project Status Distribution",
                "Count of projects grouped by lifecycle status.",
                List.of("Status", "Project Count"),
                statusRows,
                statusRows.size()));

        chartSeries.add(
            new ReportChartSeriesData(
                "project-status-chart",
                "Project Status Overview",
                ReportChartType.PIE,
                "Status",
                "Count",
                statusPoints));
      }
      case GOAL_EXECUTION -> {
        metrics.add(
            new ReportMetric(
                "GOAL_TOTAL_COUNT",
                "Active Goals",
                String.valueOf(goalData.totalCount()),
                (double) goalData.totalCount(),
                "goals",
                null,
                "OK"));
        metrics.add(
            new ReportMetric(
                "GOAL_AVG_PROGRESS",
                "Average Goal Progress",
                goalData.averageProgressPercentage() != null
                    ? goalData.averageProgressPercentage() + "%"
                    : "0.0%",
                goalData.averageProgressPercentage() != null
                    ? goalData.averageProgressPercentage()
                    : 0.0,
                "%",
                "100%",
                "OK"));
        metrics.add(
            new ReportMetric(
                "GOAL_CHECKIN_RECENT_COUNT",
                "Goals with Recent Check-Ins",
                String.valueOf(goalData.goalsWithRecentCheckinCount()),
                (double) goalData.goalsWithRecentCheckinCount(),
                "goals",
                String.valueOf(goalData.totalCount()),
                goalData.goalsWithRecentCheckinCount() == goalData.totalCount()
                    ? "GOOD"
                    : "NEEDS_IMPROVEMENT"));

        tables.add(
            new ReportTableData(
                "goal-summary-table",
                "Goal Execution Summary",
                "Overview of goal progress and check-in recency.",
                List.of("Metric", "Value"),
                List.of(
                    List.of("Active Goals Count", goalData.totalCount()),
                    List.of(
                        "Average Progress",
                        goalData.averageProgressPercentage() != null
                            ? goalData.averageProgressPercentage() + "%"
                            : "0.0%"),
                    List.of("Recent Check-Ins Count", goalData.goalsWithRecentCheckinCount())),
                3));

        chartSeries.add(
            new ReportChartSeriesData(
                "goal-progress-chart",
                "Goal Progress Overview",
                ReportChartType.BAR,
                "Metric",
                "Value",
                List.of(
                    new ReportDataPointValue(
                        "Average Progress (%)",
                        goalData.averageProgressPercentage() != null
                            ? goalData.averageProgressPercentage()
                            : 0.0,
                        "GOALS",
                        endDate.toString()),
                    new ReportDataPointValue(
                        "Recent Check-Ins",
                        (double) goalData.goalsWithRecentCheckinCount(),
                        "GOALS",
                        endDate.toString()))));
      }
      case REVIEW_RITUALS -> {
        metrics.add(
            new ReportMetric(
                "REVIEW_STREAK_DAYS",
                "Review Completion Streak",
                reviewData.dailyStreakDays() + " days",
                (double) reviewData.dailyStreakDays(),
                "days",
                null,
                "GOOD"));
        metrics.add(
            new ReportMetric(
                "REVIEW_FINALIZED_COUNT",
                "Finalized Reviews",
                String.valueOf(reviewData.finalizedReviewsCount()),
                (double) reviewData.finalizedReviewsCount(),
                "reviews",
                null,
                "OK"));

        tables.add(
            new ReportTableData(
                "review-ritual-table",
                "Review Ritual Consistency",
                "Summary of review completion streak and finalized review records.",
                List.of("Ritual Metric", "Recorded Value"),
                List.of(
                    List.of("Daily Review Streak", reviewData.dailyStreakDays() + " days"),
                    List.of("Finalized Reviews (Period)", reviewData.finalizedReviewsCount())),
                2));

        chartSeries.add(
            new ReportChartSeriesData(
                "review-streak-chart",
                "Review Consistency",
                ReportChartType.BAR,
                "Metric",
                "Count",
                List.of(
                    new ReportDataPointValue(
                        "Streak Days",
                        (double) reviewData.dailyStreakDays(),
                        "REVIEWS",
                        endDate.toString()),
                    new ReportDataPointValue(
                        "Finalized Reviews",
                        (double) reviewData.finalizedReviewsCount(),
                        "REVIEWS",
                        endDate.toString()))));
      }
      case COMPREHENSIVE_PROGRESS -> {
        var progressSummary =
            progressAggregationService.getProgressReport(
                userId, startDate, endDate, timeZoneStr, projectId, labelId, category);

        metrics.add(
            new ReportMetric(
                "TASK_COMPLETION_RATE",
                "Task Completion Rate",
                progressSummary.taskProgress().completionRatePercentage() != null
                    ? progressSummary.taskProgress().completionRatePercentage() + "%"
                    : "0.0%",
                progressSummary.taskProgress().completionRatePercentage(),
                "%",
                "100%",
                "OK"));
        metrics.add(
            new ReportMetric(
                "FOCUS_ACTUAL_MINUTES",
                "Completed Focus Time",
                progressSummary.focusProgress().actualFocusMinutes() + " mins",
                (double) progressSummary.focusProgress().actualFocusMinutes(),
                "minutes",
                null,
                "OK"));
        metrics.add(
            new ReportMetric(
                "PROJECT_AVG_PROGRESS",
                "Average Project Progress",
                progressSummary.projectProgress().averageProgressPercentage() != null
                    ? progressSummary.projectProgress().averageProgressPercentage() + "%"
                    : "0.0%",
                progressSummary.projectProgress().averageProgressPercentage(),
                "%",
                "100%",
                "OK"));
        metrics.add(
            new ReportMetric(
                "GOAL_AVG_PROGRESS",
                "Average Goal Progress",
                progressSummary.goalProgress().averageProgressPercentage() != null
                    ? progressSummary.goalProgress().averageProgressPercentage() + "%"
                    : "0.0%",
                progressSummary.goalProgress().averageProgressPercentage(),
                "%",
                "100%",
                "OK"));
        metrics.add(
            new ReportMetric(
                "REVIEW_STREAK_DAYS",
                "Review Streak",
                progressSummary.reviewProgress().dailyStreakDays() + " days",
                (double) progressSummary.reviewProgress().dailyStreakDays(),
                "days",
                null,
                "OK"));

        tables.add(
            new ReportTableData(
                "comprehensive-overview-table",
                "Comprehensive Progress Summary",
                "Cross-domain progress metrics aggregate.",
                List.of("Domain", "Key Metric", "Value"),
                List.of(
                    List.of(
                        "Tasks",
                        "Completion Rate",
                        progressSummary.taskProgress().completionRatePercentage() != null
                            ? progressSummary.taskProgress().completionRatePercentage() + "%"
                            : "0.0%"),
                    List.of(
                        "Time & Focus",
                        "Actual Focus Minutes",
                        progressSummary.focusProgress().actualFocusMinutes() + " mins"),
                    List.of(
                        "Projects",
                        "Average Progress",
                        progressSummary.projectProgress().averageProgressPercentage() != null
                            ? progressSummary.projectProgress().averageProgressPercentage() + "%"
                            : "0.0%"),
                    List.of(
                        "Goals",
                        "Average Progress",
                        progressSummary.goalProgress().averageProgressPercentage() != null
                            ? progressSummary.goalProgress().averageProgressPercentage() + "%"
                            : "0.0%"),
                    List.of(
                        "Reviews",
                        "Daily Streak",
                        progressSummary.reviewProgress().dailyStreakDays() + " days")),
                5));

        chartSeries.add(
            new ReportChartSeriesData(
                "comprehensive-domain-chart",
                "Cross-Domain Overview",
                ReportChartType.BAR,
                "Domain",
                "Progress (%) / Count",
                List.of(
                    new ReportDataPointValue(
                        "Task Completion (%)",
                        progressSummary.taskProgress().completionRatePercentage() != null
                            ? progressSummary.taskProgress().completionRatePercentage()
                            : 0.0,
                        "TASKS",
                        endDate.toString()),
                    new ReportDataPointValue(
                        "Project Progress (%)",
                        progressSummary.projectProgress().averageProgressPercentage() != null
                            ? progressSummary.projectProgress().averageProgressPercentage()
                            : 0.0,
                        "PROJECTS",
                        endDate.toString()),
                    new ReportDataPointValue(
                        "Goal Progress (%)",
                        progressSummary.goalProgress().averageProgressPercentage() != null
                            ? progressSummary.goalProgress().averageProgressPercentage()
                            : 0.0,
                        "GOALS",
                        endDate.toString()),
                    new ReportDataPointValue(
                        "Review Streak (Days)",
                        (double) progressSummary.reviewProgress().dailyStreakDays(),
                        "REVIEWS",
                        endDate.toString()))));
      }
    }

    String summaryText =
        buildSummaryText(
            definition.name(),
            startDate,
            endDate,
            taskData.completedCount(),
            taskData.totalCount(),
            focus.actualFocusMinutes(),
            projectData.totalCount(),
            goalData.totalCount(),
            reviewData.dailyStreakDays());

    return new NamedReportResult(
        definition.reportType(),
        definition.name(),
        definition.description(),
        METRIC_DICTIONARY_VERSION,
        now,
        zoneId.getId(),
        startDate,
        endDate,
        projectId,
        labelId,
        category,
        isAsync,
        definition.asyncThresholdDays(),
        jobId,
        status,
        summaryText,
        metrics,
        tables,
        chartSeries);
  }

  private static String buildSummaryText(
      String reportName,
      LocalDate startDate,
      LocalDate endDate,
      int completedTasks,
      int totalTasks,
      int focusMinutes,
      int projectsCount,
      int goalsCount,
      int reviewStreak) {

    StringBuilder sb = new StringBuilder();
    sb.append(reportName)
        .append(" from ")
        .append(startDate)
        .append(" to ")
        .append(endDate)
        .append(": ");

    if (totalTasks > 0) {
      sb.append(completedTasks).append(" of ").append(totalTasks).append(" tasks completed. ");
    } else {
      sb.append("No tasks recorded. ");
    }

    sb.append(focusMinutes).append(" focus minutes completed. ");

    if (projectsCount > 0) {
      sb.append(projectsCount).append(" active projects tracked. ");
    }

    if (goalsCount > 0) {
      sb.append(goalsCount).append(" active goals tracked. ");
    }

    sb.append(reviewStreak).append("-day review streak.");
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
