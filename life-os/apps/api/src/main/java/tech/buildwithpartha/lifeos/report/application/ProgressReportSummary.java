package tech.buildwithpartha.lifeos.report.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;

/** Application summary record for progress aggregation reports (LOS-1106). */
public record ProgressReportSummary(
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

  public record TaskProgressSummary(
      int totalCount,
      int completedCount,
      int dueCount,
      int overdueCount,
      int highPriorityCount,
      int blockedCount,
      Double completionRatePercentage) {}

  public record FocusProgressSummary(
      int plannedFocusMinutes,
      int actualFocusMinutes,
      int actualBreakMinutes,
      Integer comparisonMinutes,
      FocusComparisonSource comparisonSource,
      Double plannedVsActualRatio,
      List<CategoryMinutes> categoryBreakdown) {}

  public record CategoryMinutes(String category, int actualMinutes, Double percentage) {}

  public record ProjectProgressSummary(
      int totalCount, Map<String, Integer> statusCounts, Double averageProgressPercentage) {}

  public record GoalProgressSummary(
      int totalCount, Double averageProgressPercentage, int goalsWithRecentCheckinCount) {}

  public record HabitProgressSummary(int totalCount, Double completionRatePercentage) {}

  public record ReviewProgressSummary(int dailyStreakDays, int finalizedReviewsCount) {}
}
