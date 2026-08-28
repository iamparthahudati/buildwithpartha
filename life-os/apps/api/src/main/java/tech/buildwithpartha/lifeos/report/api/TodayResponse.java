package tech.buildwithpartha.lifeos.report.api;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult;
import tech.buildwithpartha.lifeos.report.domain.FocusComparisonSource;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

/**
 * Stable aggregate API response contract for the Today dashboard (LOS-0606, LOS-0607).
 *
 * <p>Composed of multiple domain-isolated widgets that load, succeed, or fail independently to
 * preserve partial page functionality under failure.
 */
public record TodayResponse(
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

  public static TodayResponse fromQueryResult(TodayQueryResult r) {
    if (r == null) {
      return null;
    }
    return new TodayResponse(
        r.generatedAt(),
        r.userTimeZone(),
        r.localDate(),
        MitWidget.fromQueryResult(r.mit()),
        CurrentNextBlockWidget.fromQueryResult(r.currentNextBlock()),
        TasksWidget.fromQueryResult(r.tasks()),
        ScheduleWidget.fromQueryResult(r.schedule()),
        OverdueWidget.fromQueryResult(r.overdue()),
        FocusSummaryWidget.fromQueryResult(r.focusSummary()),
        SprintWidget.fromQueryResult(r.sprint()),
        WeekWidget.fromQueryResult(r.week()),
        ActiveProjectsWidget.fromQueryResult(r.activeProjects()),
        ReviewWidget.fromQueryResult(r.review()),
        BrainDumpWidget.fromQueryResult(r.brainDump()),
        HabitsWidget.fromQueryResult(r.habits()),
        MetricsWidget.fromQueryResult(r.metrics()));
  }

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

    public static MitWidget fromQueryResult(TodayQueryResult.MitWidget w) {
      if (w == null) {
        return empty();
      }
      return new MitWidget(w.status(), MitData.fromQueryResult(w.data()), w.error());
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
      boolean focusActive) {
    public static MitData fromQueryResult(TodayQueryResult.MitData d) {
      if (d == null) {
        return null;
      }
      return new MitData(
          d.taskId(),
          d.title(),
          d.projectId(),
          d.projectName(),
          d.projectColor(),
          d.priority(),
          d.dueDate(),
          d.completed(),
          d.focusActive());
    }
  }

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

    public static CurrentNextBlockWidget fromQueryResult(
        TodayQueryResult.CurrentNextBlockWidget w) {
      if (w == null) {
        return empty();
      }
      return new CurrentNextBlockWidget(
          w.status(), CurrentNextBlockData.fromQueryResult(w.data()), w.error());
    }
  }

  public record CurrentNextBlockData(TimeBlockDto current, TimeBlockDto next) {
    public static CurrentNextBlockData fromQueryResult(TodayQueryResult.CurrentNextBlockData d) {
      if (d == null) {
        return null;
      }
      return new CurrentNextBlockData(
          TimeBlockDto.fromQueryResult(d.current()), TimeBlockDto.fromQueryResult(d.next()));
    }
  }

  public record TimeBlockDto(
      UUID id,
      String title,
      LocalTime startTime,
      LocalTime endTime,
      String category,
      UUID projectId,
      String projectName,
      boolean completed) {
    public static TimeBlockDto fromQueryResult(TodayQueryResult.TimeBlockDto b) {
      if (b == null) {
        return null;
      }
      return new TimeBlockDto(
          b.id(),
          b.title(),
          b.startTime(),
          b.endTime(),
          b.category(),
          b.projectId(),
          b.projectName(),
          b.completed());
    }
  }

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

    public static TasksWidget fromQueryResult(TodayQueryResult.TasksWidget w) {
      if (w == null) {
        return empty();
      }
      return new TasksWidget(w.status(), TasksData.fromQueryResult(w.data()), w.error());
    }
  }

  public record TasksData(List<TodayTaskDto> tasks) {
    public static TasksData fromQueryResult(TodayQueryResult.TasksData d) {
      if (d == null || d.tasks() == null) {
        return new TasksData(List.of());
      }
      return new TasksData(d.tasks().stream().map(TodayTaskDto::fromQueryResult).toList());
    }
  }

  public record TodayTaskDto(
      UUID id,
      String title,
      UUID projectId,
      String projectName,
      String projectColor,
      String priority,
      LocalDate dueDate,
      boolean completed,
      boolean isOverdue) {
    public static TodayTaskDto fromQueryResult(TodayQueryResult.TodayTaskDto t) {
      if (t == null) {
        return null;
      }
      return new TodayTaskDto(
          t.id(),
          t.title(),
          t.projectId(),
          t.projectName(),
          t.projectColor(),
          t.priority(),
          t.dueDate(),
          t.completed(),
          t.isOverdue());
    }
  }

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

    public static ScheduleWidget fromQueryResult(TodayQueryResult.ScheduleWidget w) {
      if (w == null) {
        return empty();
      }
      return new ScheduleWidget(w.status(), ScheduleData.fromQueryResult(w.data()), w.error());
    }
  }

  public record ScheduleData(List<TimeBlockDto> blocks, List<ScheduleConflictDto> conflicts) {
    public static ScheduleData fromQueryResult(TodayQueryResult.ScheduleData d) {
      if (d == null) {
        return new ScheduleData(List.of(), List.of());
      }
      List<TimeBlockDto> blocks =
          d.blocks() == null
              ? List.of()
              : d.blocks().stream().map(TimeBlockDto::fromQueryResult).toList();
      List<ScheduleConflictDto> conflicts =
          d.conflicts() == null
              ? List.of()
              : d.conflicts().stream().map(ScheduleConflictDto::fromQueryResult).toList();
      return new ScheduleData(blocks, conflicts);
    }
  }

  public record ScheduleConflictDto(UUID firstBlockId, UUID secondBlockId, String description) {
    public static ScheduleConflictDto fromQueryResult(TodayQueryResult.ScheduleConflictDto c) {
      if (c == null) {
        return null;
      }
      return new ScheduleConflictDto(c.firstBlockId(), c.secondBlockId(), c.description());
    }
  }

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

    public static OverdueWidget fromQueryResult(TodayQueryResult.OverdueWidget w) {
      if (w == null) {
        return empty();
      }
      return new OverdueWidget(w.status(), OverdueData.fromQueryResult(w.data()), w.error());
    }
  }

  public record OverdueData(int totalCount, List<TodayTaskDto> topOverdueTasks) {
    public static OverdueData fromQueryResult(TodayQueryResult.OverdueData d) {
      if (d == null || d.topOverdueTasks() == null) {
        return new OverdueData(0, List.of());
      }
      return new OverdueData(
          d.totalCount(), d.topOverdueTasks().stream().map(TodayTaskDto::fromQueryResult).toList());
    }
  }

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

    public static FocusSummaryWidget fromQueryResult(TodayQueryResult.FocusSummaryWidget w) {
      if (w == null) {
        return empty();
      }
      return new FocusSummaryWidget(
          w.status(), FocusSummaryData.fromQueryResult(w.data()), w.error());
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
    public static FocusSummaryData fromQueryResult(TodayQueryResult.FocusSummaryData d) {
      if (d == null) {
        return new FocusSummaryData(
            0, 0, null, false, null, null, FocusComparisonSource.NONE, null);
      }
      return new FocusSummaryData(
          d.actualFocusMinutesToday(),
          d.plannedFocusMinutesToday(),
          d.activeSessionTimerSummary(),
          d.isSessionActive(),
          d.dailyFocusTargetMinutes(),
          d.comparisonMinutes(),
          d.comparisonSource(),
          d.progressPercentage());
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

    public static SprintWidget fromQueryResult(TodayQueryResult.SprintWidget w) {
      if (w == null) {
        return empty();
      }
      return new SprintWidget(w.status(), SprintData.fromQueryResult(w.data()), w.error());
    }
  }

  public record SprintData(
      UUID sprintId,
      String name,
      int completedStoryPoints,
      int totalStoryPoints,
      LocalDate startDate,
      LocalDate endDate) {
    public static SprintData fromQueryResult(TodayQueryResult.SprintData d) {
      if (d == null) {
        return null;
      }
      return new SprintData(
          d.sprintId(),
          d.name(),
          d.completedStoryPoints(),
          d.totalStoryPoints(),
          d.startDate(),
          d.endDate());
    }
  }

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

    public static WeekWidget fromQueryResult(TodayQueryResult.WeekWidget w) {
      if (w == null) {
        return empty();
      }
      return new WeekWidget(w.status(), WeekData.fromQueryResult(w.data()), w.error());
    }
  }

  public record WeekData(
      int completedTasksCount, int totalTasksCount, List<WeeklyGoalDto> outcomes) {
    public static WeekData fromQueryResult(TodayQueryResult.WeekData d) {
      if (d == null || d.outcomes() == null) {
        return new WeekData(0, 0, List.of());
      }
      return new WeekData(
          d.completedTasksCount(),
          d.totalTasksCount(),
          d.outcomes().stream().map(WeeklyGoalDto::fromQueryResult).toList());
    }
  }

  public record WeeklyGoalDto(UUID id, String title, boolean completed) {
    public static WeeklyGoalDto fromQueryResult(TodayQueryResult.WeeklyGoalDto g) {
      if (g == null) {
        return null;
      }
      return new WeeklyGoalDto(g.id(), g.title(), g.completed());
    }
  }

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

    public static ActiveProjectsWidget fromQueryResult(TodayQueryResult.ActiveProjectsWidget w) {
      if (w == null) {
        return empty();
      }
      return new ActiveProjectsWidget(
          w.status(), ActiveProjectsData.fromQueryResult(w.data()), w.error());
    }
  }

  public record ActiveProjectsData(List<ActiveProjectDto> projects) {
    public static ActiveProjectsData fromQueryResult(TodayQueryResult.ActiveProjectsData d) {
      if (d == null || d.projects() == null) {
        return new ActiveProjectsData(List.of());
      }
      return new ActiveProjectsData(
          d.projects().stream().map(ActiveProjectDto::fromQueryResult).toList());
    }
  }

  public record ActiveProjectDto(
      UUID id,
      String name,
      String color,
      int completedTasksCount,
      int totalTasksCount,
      String status) {
    public static ActiveProjectDto fromQueryResult(TodayQueryResult.ActiveProjectDto p) {
      if (p == null) {
        return null;
      }
      return new ActiveProjectDto(
          p.id(), p.name(), p.color(), p.completedTasksCount(), p.totalTasksCount(), p.status());
    }
  }

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

    public static ReviewWidget fromQueryResult(TodayQueryResult.ReviewWidget w) {
      if (w == null) {
        return empty();
      }
      return new ReviewWidget(w.status(), ReviewData.fromQueryResult(w.data()), w.error());
    }
  }

  public record ReviewData(
      boolean morningReviewCompleted,
      boolean eveningReviewCompleted,
      String morningReviewState,
      String eveningReviewState) {
    public static ReviewData fromQueryResult(TodayQueryResult.ReviewData d) {
      if (d == null) {
        return new ReviewData(false, false, "NOT_STARTED", "NOT_STARTED");
      }
      return new ReviewData(
          d.morningReviewCompleted(),
          d.eveningReviewCompleted(),
          d.morningReviewState(),
          d.eveningReviewState());
    }
  }

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

    public static BrainDumpWidget fromQueryResult(TodayQueryResult.BrainDumpWidget w) {
      if (w == null) {
        return empty();
      }
      return new BrainDumpWidget(w.status(), BrainDumpData.fromQueryResult(w.data()), w.error());
    }
  }

  public record BrainDumpData(int unprocessedCount) {
    public static BrainDumpData fromQueryResult(TodayQueryResult.BrainDumpData d) {
      if (d == null) {
        return new BrainDumpData(0);
      }
      return new BrainDumpData(d.unprocessedCount());
    }
  }

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

    public static HabitsWidget fromQueryResult(TodayQueryResult.HabitsWidget w) {
      if (w == null) {
        return empty();
      }
      return new HabitsWidget(w.status(), HabitsData.fromQueryResult(w.data()), w.error());
    }
  }

  public record HabitsData(List<TodayHabitDto> habits) {
    public static HabitsData fromQueryResult(TodayQueryResult.HabitsData d) {
      if (d == null || d.habits() == null) {
        return new HabitsData(List.of());
      }
      return new HabitsData(d.habits().stream().map(TodayHabitDto::fromQueryResult).toList());
    }
  }

  public record TodayHabitDto(
      UUID id, String title, String frequency, boolean completedToday, int streakDays) {
    public static TodayHabitDto fromQueryResult(TodayQueryResult.TodayHabitDto h) {
      if (h == null) {
        return null;
      }
      return new TodayHabitDto(
          h.id(), h.title(), h.frequency(), h.completedToday(), h.streakDays());
    }
  }

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

    public static MetricsWidget fromQueryResult(TodayQueryResult.MetricsWidget w) {
      if (w == null) {
        return empty();
      }
      return new MetricsWidget(w.status(), MetricsData.fromQueryResult(w.data()), w.error());
    }
  }

  public record MetricsData(List<TodayMetricDto> metrics) {
    public static MetricsData fromQueryResult(TodayQueryResult.MetricsData d) {
      if (d == null || d.metrics() == null) {
        return new MetricsData(List.of());
      }
      return new MetricsData(d.metrics().stream().map(TodayMetricDto::fromQueryResult).toList());
    }
  }

  public record TodayMetricDto(
      String key, String label, String value, String unit, String trend, String status) {
    public static TodayMetricDto fromQueryResult(TodayQueryResult.TodayMetricDto m) {
      if (m == null) {
        return null;
      }
      return new TodayMetricDto(m.key(), m.label(), m.value(), m.unit(), m.trend(), m.status());
    }
  }
}
