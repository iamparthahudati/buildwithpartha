package tech.buildwithpartha.lifeos.report.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.ProgressReportSummary;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;

/** REST DTO for progress aggregation reports (LOS-1106). */
public record ProgressReportResponse(
    String metricDictionaryVersion,
    Instant generatedAt,
    String timeZone,
    LocalDate startDate,
    LocalDate endDate,
    UUID projectId,
    UUID labelId,
    String category,
    TaskProgressSummary taskProgress,
    FocusProgressSummary focusProgress,
    ProjectProgressSummary projectProgress,
    GoalProgressSummary goalProgress,
    HabitProgressSummary habitProgress,
    ReviewProgressSummary reviewProgress,
    String summaryText) {

  public static ProgressReportResponse from(ProgressReportSummary summary) {
    return new ProgressReportResponse(
        summary.metricDictionaryVersion(),
        summary.generatedAt(),
        summary.timeZone(),
        summary.startDate(),
        summary.endDate(),
        summary.projectId(),
        summary.labelId(),
        summary.category(),
        TaskProgressSummary.from(summary.taskProgress()),
        FocusProgressSummary.from(summary.focusProgress()),
        ProjectProgressSummary.from(summary.projectProgress()),
        GoalProgressSummary.from(summary.goalProgress()),
        HabitProgressSummary.from(summary.habitProgress()),
        ReviewProgressSummary.from(summary.reviewProgress()),
        summary.summaryText());
  }

  public record TaskProgressSummary(
      int totalCount,
      int completedCount,
      int dueCount,
      int overdueCount,
      int highPriorityCount,
      int blockedCount,
      Double completionRatePercentage) {

    public static TaskProgressSummary from(ProgressReportSummary.TaskProgressSummary summary) {
      return new TaskProgressSummary(
          summary.totalCount(),
          summary.completedCount(),
          summary.dueCount(),
          summary.overdueCount(),
          summary.highPriorityCount(),
          summary.blockedCount(),
          summary.completionRatePercentage());
    }
  }

  public record FocusProgressSummary(
      int plannedFocusMinutes,
      int actualFocusMinutes,
      int actualBreakMinutes,
      Integer comparisonMinutes,
      FocusComparisonSource comparisonSource,
      Double plannedVsActualRatio,
      List<CategoryMinutes> categoryBreakdown) {

    public static FocusProgressSummary from(ProgressReportSummary.FocusProgressSummary summary) {
      List<CategoryMinutes> categories =
          summary.categoryBreakdown().stream().map(CategoryMinutes::from).toList();
      return new FocusProgressSummary(
          summary.plannedFocusMinutes(),
          summary.actualFocusMinutes(),
          summary.actualBreakMinutes(),
          summary.comparisonMinutes(),
          summary.comparisonSource(),
          summary.plannedVsActualRatio(),
          categories);
    }
  }

  public record CategoryMinutes(String category, int actualMinutes, Double percentage) {
    public static CategoryMinutes from(ProgressReportSummary.CategoryMinutes summary) {
      return new CategoryMinutes(summary.category(), summary.actualMinutes(), summary.percentage());
    }
  }

  public record ProjectProgressSummary(
      int totalCount, Map<String, Integer> statusCounts, Double averageProgressPercentage) {

    public static ProjectProgressSummary from(
        ProgressReportSummary.ProjectProgressSummary summary) {
      return new ProjectProgressSummary(
          summary.totalCount(), summary.statusCounts(), summary.averageProgressPercentage());
    }
  }

  public record GoalProgressSummary(
      int totalCount, Double averageProgressPercentage, int goalsWithRecentCheckinCount) {

    public static GoalProgressSummary from(ProgressReportSummary.GoalProgressSummary summary) {
      return new GoalProgressSummary(
          summary.totalCount(),
          summary.averageProgressPercentage(),
          summary.goalsWithRecentCheckinCount());
    }
  }

  public record HabitProgressSummary(int totalCount, Double completionRatePercentage) {
    public static HabitProgressSummary from(ProgressReportSummary.HabitProgressSummary summary) {
      return new HabitProgressSummary(summary.totalCount(), summary.completionRatePercentage());
    }
  }

  public record ReviewProgressSummary(int dailyStreakDays, int finalizedReviewsCount) {
    public static ReviewProgressSummary from(ProgressReportSummary.ReviewProgressSummary summary) {
      return new ReviewProgressSummary(summary.dailyStreakDays(), summary.finalizedReviewsCount());
    }
  }
}
