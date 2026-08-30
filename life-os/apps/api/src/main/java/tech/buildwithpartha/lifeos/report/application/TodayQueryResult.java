package tech.buildwithpartha.lifeos.report.application;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

/** Domain query result representing aggregated Today dashboard data (LOS-0607). */
public record TodayQueryResult(
    Instant generatedAt,
    String userTimeZone,
    LocalDate localDate,
    MitWidget mit,
    CurrentNextBlockWidget currentNextBlock,
    TasksWidget tasks,
    ScheduleWidget schedule,
    OverdueWidget overdue,
    FocusSummaryWidget focusSummary,
    SprintWidget sprint,
    WeekWidget week,
    ActiveProjectsWidget activeProjects,
    ReviewWidget review,
    BrainDumpWidget brainDump,
    HabitsWidget habits,
    MetricsWidget metrics) {

  // --- 1. MIT (Most Important Task) ---

  public record MitWidget(WidgetStatus status, MitData data, String error) {
    public static MitWidget empty() {
      return new MitWidget(WidgetStatus.EMPTY, null, null);
    }

    public static MitWidget error(String message) {
      return new MitWidget(WidgetStatus.ERROR, null, message);
    }

    public static MitWidget success(MitData data) {
      return new MitWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record MitData(
      UUID taskId,
      String title,
      UUID projectId,
      String projectName,
      String projectColor,
      String priority,
      LocalDate dueDate,
      boolean completed,
      boolean focusActive) {}

  // --- 2. Current / Next Time Block ---

  public record CurrentNextBlockWidget(
      WidgetStatus status, CurrentNextBlockData data, String error) {
    public static CurrentNextBlockWidget empty() {
      return new CurrentNextBlockWidget(WidgetStatus.EMPTY, null, null);
    }

    public static CurrentNextBlockWidget error(String message) {
      return new CurrentNextBlockWidget(WidgetStatus.ERROR, null, message);
    }

    public static CurrentNextBlockWidget success(CurrentNextBlockData data) {
      return new CurrentNextBlockWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record CurrentNextBlockData(TimeBlockDto current, TimeBlockDto next) {}

  public record TimeBlockDto(
      UUID id,
      String title,
      LocalTime startTime,
      LocalTime endTime,
      String category,
      UUID projectId,
      String projectName,
      boolean completed) {}

  // --- 3. Today's Tasks ---

  public record TasksWidget(WidgetStatus status, TasksData data, String error) {
    public static TasksWidget empty() {
      return new TasksWidget(WidgetStatus.EMPTY, new TasksData(List.of()), null);
    }

    public static TasksWidget error(String message) {
      return new TasksWidget(WidgetStatus.ERROR, null, message);
    }

    public static TasksWidget success(TasksData data) {
      return new TasksWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record TasksData(List<TodayTaskDto> tasks) {}

  public record TodayTaskDto(
      UUID id,
      String title,
      UUID projectId,
      String projectName,
      String projectColor,
      String priority,
      LocalDate dueDate,
      boolean completed,
      boolean isOverdue) {}

  // --- 4. Today's Schedule ---

  public record ScheduleWidget(WidgetStatus status, ScheduleData data, String error) {
    public static ScheduleWidget empty() {
      return new ScheduleWidget(WidgetStatus.EMPTY, new ScheduleData(List.of(), List.of()), null);
    }

    public static ScheduleWidget error(String message) {
      return new ScheduleWidget(WidgetStatus.ERROR, null, message);
    }

    public static ScheduleWidget success(ScheduleData data) {
      return new ScheduleWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record ScheduleData(List<TimeBlockDto> blocks, List<ScheduleConflictDto> conflicts) {}

  public record ScheduleConflictDto(UUID firstBlockId, UUID secondBlockId, String description) {}

  // --- 5. Overdue / Replan ---

  public record OverdueWidget(WidgetStatus status, OverdueData data, String error) {
    public static OverdueWidget empty() {
      return new OverdueWidget(WidgetStatus.EMPTY, new OverdueData(0, List.of()), null);
    }

    public static OverdueWidget error(String message) {
      return new OverdueWidget(WidgetStatus.ERROR, null, message);
    }

    public static OverdueWidget success(OverdueData data) {
      return new OverdueWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record OverdueData(int totalCount, List<TodayTaskDto> topOverdueTasks) {}

  // --- 6. Focus Summary ---

  public record FocusSummaryWidget(WidgetStatus status, FocusSummaryData data, String error) {
    public static FocusSummaryWidget empty() {
      return new FocusSummaryWidget(
          WidgetStatus.EMPTY,
          new FocusSummaryData(0, 0, null, false, null, null, FocusComparisonSource.NONE, null),
          null);
    }

    public static FocusSummaryWidget error(String message) {
      return new FocusSummaryWidget(WidgetStatus.ERROR, null, message);
    }

    public static FocusSummaryWidget success(FocusSummaryData data) {
      return new FocusSummaryWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record FocusSummaryData(
      int actualFocusMinutesToday,
      int plannedFocusMinutesToday,
      String activeSessionTimerSummary,
      boolean isSessionActive,
      Integer dailyFocusTargetMinutes,
      Integer comparisonMinutes,
      FocusComparisonSource comparisonSource,
      Integer progressPercentage) {

    public FocusSummaryData(
        int actualFocusMinutesToday,
        int plannedFocusMinutesToday,
        String activeSessionTimerSummary,
        boolean isSessionActive) {
      this(
          actualFocusMinutesToday,
          plannedFocusMinutesToday,
          activeSessionTimerSummary,
          isSessionActive,
          null,
          plannedFocusMinutesToday > 0 ? plannedFocusMinutesToday : null,
          plannedFocusMinutesToday > 0
              ? FocusComparisonSource.PLANNED_FOCUS_BLOCKS
              : FocusComparisonSource.NONE,
          plannedFocusMinutesToday > 0
              ? Math.toIntExact(
                  Math.round((actualFocusMinutesToday * 100.0) / plannedFocusMinutesToday))
              : null);
    }
  }

  // --- 7. Sprint ---

  public record SprintWidget(WidgetStatus status, SprintData data, String error) {
    public static SprintWidget empty() {
      return new SprintWidget(WidgetStatus.EMPTY, null, null);
    }

    public static SprintWidget error(String message) {
      return new SprintWidget(WidgetStatus.ERROR, null, message);
    }

    public static SprintWidget success(SprintData data) {
      return new SprintWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record SprintData(
      UUID sprintId,
      String name,
      int completedStoryPoints,
      int totalStoryPoints,
      LocalDate startDate,
      LocalDate endDate) {}

  // --- 8. Week Summary ---

  public record WeekWidget(WidgetStatus status, WeekData data, String error) {
    public static WeekWidget empty() {
      return new WeekWidget(WidgetStatus.EMPTY, new WeekData(0, 0, List.of()), null);
    }

    public static WeekWidget error(String message) {
      return new WeekWidget(WidgetStatus.ERROR, null, message);
    }

    public static WeekWidget success(WeekData data) {
      return new WeekWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record WeekData(
      int completedTasksCount, int totalTasksCount, List<WeeklyGoalDto> outcomes) {}

  public record WeeklyGoalDto(UUID id, String title, boolean completed) {}

  // --- 9. Active Projects ---

  public record ActiveProjectsWidget(WidgetStatus status, ActiveProjectsData data, String error) {
    public static ActiveProjectsWidget empty() {
      return new ActiveProjectsWidget(WidgetStatus.EMPTY, new ActiveProjectsData(List.of()), null);
    }

    public static ActiveProjectsWidget error(String message) {
      return new ActiveProjectsWidget(WidgetStatus.ERROR, null, message);
    }

    public static ActiveProjectsWidget success(ActiveProjectsData data) {
      return new ActiveProjectsWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record ActiveProjectsData(List<ActiveProjectDto> projects) {}

  public record ActiveProjectDto(
      UUID id,
      String name,
      String color,
      int completedTasksCount,
      int totalTasksCount,
      String status) {}

  // --- 10. Review ---

  public record ReviewWidget(WidgetStatus status, ReviewData data, String error) {
    public static ReviewWidget empty() {
      return new ReviewWidget(
          WidgetStatus.EMPTY, new ReviewData(false, false, "NOT_STARTED", "NOT_STARTED"), null);
    }

    public static ReviewWidget error(String message) {
      return new ReviewWidget(WidgetStatus.ERROR, null, message);
    }

    public static ReviewWidget success(ReviewData data) {
      return new ReviewWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record ReviewData(
      boolean morningReviewCompleted,
      boolean eveningReviewCompleted,
      String morningReviewState,
      String eveningReviewState) {}

  // --- 11. Brain Dump ---

  public record BrainDumpWidget(WidgetStatus status, BrainDumpData data, String error) {
    public static BrainDumpWidget empty() {
      return new BrainDumpWidget(WidgetStatus.EMPTY, new BrainDumpData(0), null);
    }

    public static BrainDumpWidget error(String message) {
      return new BrainDumpWidget(WidgetStatus.ERROR, null, message);
    }

    public static BrainDumpWidget success(BrainDumpData data) {
      return new BrainDumpWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record BrainDumpData(int unprocessedCount) {}

  // --- 12. Habits ---

  public record HabitsWidget(WidgetStatus status, HabitsData data, String error) {
    public static HabitsWidget empty() {
      return new HabitsWidget(WidgetStatus.EMPTY, new HabitsData(List.of()), null);
    }

    public static HabitsWidget error(String message) {
      return new HabitsWidget(WidgetStatus.ERROR, null, message);
    }

    public static HabitsWidget success(HabitsData data) {
      return new HabitsWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record HabitsData(List<TodayHabitDto> habits) {}

  public record TodayHabitDto(
      UUID id,
      String name,
      String cadence,
      int targetCount,
      int completedCount,
      LocalDate localDate,
      String timeZone,
      boolean paused,
      int currentStreak) {}

  // --- 13. Metrics ---

  public record MetricsWidget(WidgetStatus status, MetricsData data, String error) {
    public static MetricsWidget empty() {
      return new MetricsWidget(WidgetStatus.EMPTY, new MetricsData(List.of()), null);
    }

    public static MetricsWidget error(String message) {
      return new MetricsWidget(WidgetStatus.ERROR, null, message);
    }

    public static MetricsWidget success(MetricsData data) {
      return new MetricsWidget(WidgetStatus.SUCCESS, data, null);
    }
  }

  public record MetricsData(List<TodayMetricDto> metrics) {}

  public record TodayMetricDto(
      String key, String label, String value, String unit, String trend, String status) {}
}
