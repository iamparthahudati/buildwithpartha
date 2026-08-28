package tech.buildwithpartha.lifeos.report.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.user.UserTimeZoneProvider;
import tech.buildwithpartha.lifeos.report.api.TodayResponse;
import tech.buildwithpartha.lifeos.report.application.provider.ActiveProjectsWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.BrainDumpWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.CurrentNextBlockWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.FocusSummaryWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.HabitsWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.MetricsWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.MitWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.OverdueWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.ReviewWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.ScheduleWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.SprintWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.TasksWidgetProvider;
import tech.buildwithpartha.lifeos.report.application.provider.WeekWidgetProvider;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultActiveProjectsWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultBrainDumpWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultCurrentNextBlockWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultHabitsWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultMetricsWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultMitWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultOverdueWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultReviewWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultScheduleWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultSprintWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultTasksWidgetProvider;
import tech.buildwithpartha.lifeos.report.infrastructure.provider.DefaultWeekWidgetProvider;

class TodayServiceTests {

  private UserTimeZoneProvider userTimeZoneProvider;
  private Clock clock;

  private MitWidgetProvider mitWidgetProvider;
  private CurrentNextBlockWidgetProvider currentNextBlockWidgetProvider;
  private TasksWidgetProvider tasksWidgetProvider;
  private ScheduleWidgetProvider scheduleWidgetProvider;
  private OverdueWidgetProvider overdueWidgetProvider;
  private FocusSummaryWidgetProvider focusSummaryWidgetProvider;
  private SprintWidgetProvider sprintWidgetProvider;
  private WeekWidgetProvider weekWidgetProvider;
  private ActiveProjectsWidgetProvider activeProjectsWidgetProvider;
  private ReviewWidgetProvider reviewWidgetProvider;
  private BrainDumpWidgetProvider brainDumpWidgetProvider;
  private HabitsWidgetProvider habitsWidgetProvider;
  private MetricsWidgetProvider metricsWidgetProvider;

  private TodayService todayService;

  @BeforeEach
  void setUp() {
    userTimeZoneProvider = mock(UserTimeZoneProvider.class);
    // 2026-08-20T22:00:00Z -> In Asia/Tokyo (UTC+9), it is 2026-08-21
    Instant fixedInstant = Instant.parse("2026-08-20T22:00:00Z");
    clock = Clock.fixed(fixedInstant, ZoneId.of("UTC"));

    mitWidgetProvider = new DefaultMitWidgetProvider();
    currentNextBlockWidgetProvider = new DefaultCurrentNextBlockWidgetProvider();
    tasksWidgetProvider = new DefaultTasksWidgetProvider();
    scheduleWidgetProvider = new DefaultScheduleWidgetProvider();
    overdueWidgetProvider = new DefaultOverdueWidgetProvider();
    focusSummaryWidgetProvider = mock(FocusSummaryWidgetProvider.class);
    given(focusSummaryWidgetProvider.getWidget(any(), any(), any()))
        .willReturn(TodayQueryResult.FocusSummaryWidget.empty());
    sprintWidgetProvider = new DefaultSprintWidgetProvider();
    weekWidgetProvider = new DefaultWeekWidgetProvider();
    activeProjectsWidgetProvider = new DefaultActiveProjectsWidgetProvider();
    reviewWidgetProvider = new DefaultReviewWidgetProvider();
    brainDumpWidgetProvider = new DefaultBrainDumpWidgetProvider();
    habitsWidgetProvider = new DefaultHabitsWidgetProvider();
    metricsWidgetProvider = new DefaultMetricsWidgetProvider();

    todayService =
        new TodayService(
            userTimeZoneProvider,
            clock,
            mitWidgetProvider,
            currentNextBlockWidgetProvider,
            tasksWidgetProvider,
            scheduleWidgetProvider,
            overdueWidgetProvider,
            focusSummaryWidgetProvider,
            sprintWidgetProvider,
            weekWidgetProvider,
            activeProjectsWidgetProvider,
            reviewWidgetProvider,
            brainDumpWidgetProvider,
            habitsWidgetProvider,
            metricsWidgetProvider);
  }

  @Test
  void computesLocalDateInUserTimeZone() {
    UUID userId = UUID.randomUUID();
    given(userTimeZoneProvider.getUserTimeZone(userId)).willReturn("Asia/Tokyo");

    TodayQueryResult result = todayService.getToday(userId);

    assertThat(result.userTimeZone()).isEqualTo("Asia/Tokyo");
    assertThat(result.localDate()).isEqualTo(LocalDate.of(2026, 8, 21));
    assertThat(result.mit().status()).isEqualTo(WidgetStatus.EMPTY);
  }

  @Test
  void fallsBackToUtcWhenUserTimeZoneIsInvalid() {
    UUID userId = UUID.randomUUID();
    given(userTimeZoneProvider.getUserTimeZone(userId)).willReturn("INVALID_TIME_ZONE_NAME");

    TodayQueryResult result = todayService.getToday(userId);

    assertThat(result.userTimeZone()).isEqualTo("UTC");
    assertThat(result.localDate()).isEqualTo(LocalDate.of(2026, 8, 20));
  }

  @Test
  void isolatesProviderFailureToSingleWidget() {
    UUID userId = UUID.randomUUID();
    given(userTimeZoneProvider.getUserTimeZone(userId)).willReturn("UTC");

    MitWidgetProvider failingMitProvider = mock(MitWidgetProvider.class);
    given(failingMitProvider.getWidget(any(), any(), any()))
        .willThrow(new RuntimeException("Database timeout"));

    TodayService serviceWithFailure =
        new TodayService(
            userTimeZoneProvider,
            clock,
            failingMitProvider,
            currentNextBlockWidgetProvider,
            tasksWidgetProvider,
            scheduleWidgetProvider,
            overdueWidgetProvider,
            focusSummaryWidgetProvider,
            sprintWidgetProvider,
            weekWidgetProvider,
            activeProjectsWidgetProvider,
            reviewWidgetProvider,
            brainDumpWidgetProvider,
            habitsWidgetProvider,
            metricsWidgetProvider);

    TodayQueryResult result = serviceWithFailure.getToday(userId);

    assertThat(result.mit().status()).isEqualTo(WidgetStatus.ERROR);
    assertThat(result.mit().error()).isEqualTo("Provider execution failed");
    // Other widgets remain functional
    assertThat(result.tasks().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(result.schedule().status()).isEqualTo(WidgetStatus.EMPTY);
  }

  @Test
  void verifiesTodayResponseMappingFromQueryResult() {
    assertThat(TodayResponse.fromQueryResult(null)).isNull();

    UUID id = UUID.randomUUID();
    LocalDate now = LocalDate.now();

    TodayQueryResult.MitData mitData =
        new TodayQueryResult.MitData(id, "MIT", id, "Project", "#fff", "P1", now, false, true);
    TodayQueryResult.MitWidget mit = TodayQueryResult.MitWidget.success(mitData);

    TodayQueryResult.TimeBlockDto block =
        new TodayQueryResult.TimeBlockDto(
            id, "Block", LocalTime.of(9, 0), LocalTime.of(10, 0), "Work", id, "Proj", false);
    TodayQueryResult.CurrentNextBlockWidget currentNextBlock =
        TodayQueryResult.CurrentNextBlockWidget.success(
            new TodayQueryResult.CurrentNextBlockData(block, block));

    TodayQueryResult.TodayTaskDto task =
        new TodayQueryResult.TodayTaskDto(id, "Task", id, "Proj", "#fff", "P1", now, false, false);
    TodayQueryResult.TasksWidget tasks =
        TodayQueryResult.TasksWidget.success(new TodayQueryResult.TasksData(List.of(task)));

    TodayQueryResult.ScheduleConflictDto conflict =
        new TodayQueryResult.ScheduleConflictDto(id, id, "Overlap");
    TodayQueryResult.ScheduleWidget schedule =
        TodayQueryResult.ScheduleWidget.success(
            new TodayQueryResult.ScheduleData(List.of(block), List.of(conflict)));

    TodayQueryResult.OverdueWidget overdue =
        TodayQueryResult.OverdueWidget.success(new TodayQueryResult.OverdueData(1, List.of(task)));

    TodayQueryResult.FocusSummaryWidget focusSummary =
        TodayQueryResult.FocusSummaryWidget.success(
            new TodayQueryResult.FocusSummaryData(30, 60, "25:00", true));

    TodayQueryResult.SprintWidget sprint =
        TodayQueryResult.SprintWidget.success(
            new TodayQueryResult.SprintData(id, "Sprint 1", 5, 10, now, now.plusDays(7)));

    TodayQueryResult.WeeklyGoalDto goal = new TodayQueryResult.WeeklyGoalDto(id, "Goal", true);
    TodayQueryResult.WeekWidget week =
        TodayQueryResult.WeekWidget.success(new TodayQueryResult.WeekData(5, 10, List.of(goal)));

    TodayQueryResult.ActiveProjectDto project =
        new TodayQueryResult.ActiveProjectDto(id, "Proj", "#fff", 2, 5, "ACTIVE");
    TodayQueryResult.ActiveProjectsWidget activeProjects =
        TodayQueryResult.ActiveProjectsWidget.success(
            new TodayQueryResult.ActiveProjectsData(List.of(project)));

    TodayQueryResult.ReviewWidget review =
        TodayQueryResult.ReviewWidget.success(
            new TodayQueryResult.ReviewData(true, false, "COMPLETED", "IN_PROGRESS"));

    TodayQueryResult.BrainDumpWidget brainDump =
        TodayQueryResult.BrainDumpWidget.success(new TodayQueryResult.BrainDumpData(3));

    TodayQueryResult.TodayHabitDto habit =
        new TodayQueryResult.TodayHabitDto(id, "Habit", "DAILY", true, 5);
    TodayQueryResult.HabitsWidget habits =
        TodayQueryResult.HabitsWidget.success(new TodayQueryResult.HabitsData(List.of(habit)));

    TodayQueryResult.TodayMetricDto metric =
        new TodayQueryResult.TodayMetricDto("k", "Label", "10", "pts", "UP", "GOOD");
    TodayQueryResult.MetricsWidget metrics =
        TodayQueryResult.MetricsWidget.success(new TodayQueryResult.MetricsData(List.of(metric)));

    TodayQueryResult queryResult =
        new TodayQueryResult(
            Instant.now(),
            "UTC",
            now,
            mit,
            currentNextBlock,
            tasks,
            schedule,
            overdue,
            focusSummary,
            sprint,
            week,
            activeProjects,
            review,
            brainDump,
            habits,
            metrics);

    TodayResponse response = TodayResponse.fromQueryResult(queryResult);

    assertThat(response).isNotNull();
    assertThat(response.mit().data().title()).isEqualTo("MIT");
    assertThat(response.currentNextBlock().data().current().title()).isEqualTo("Block");
    assertThat(response.tasks().data().tasks()).hasSize(1);
    assertThat(response.schedule().data().conflicts()).hasSize(1);
    assertThat(response.overdue().data().totalCount()).isEqualTo(1);
    assertThat(response.focusSummary().data().actualFocusMinutesToday()).isEqualTo(30);
    assertThat(response.sprint().data().name()).isEqualTo("Sprint 1");
    assertThat(response.week().data().outcomes()).hasSize(1);
    assertThat(response.activeProjects().data().projects()).hasSize(1);
    assertThat(response.review().data().morningReviewCompleted()).isTrue();
    assertThat(response.brainDump().data().unprocessedCount()).isEqualTo(3);
    assertThat(response.habits().data().habits()).hasSize(1);
    assertThat(response.metrics().data().metrics()).hasSize(1);
  }

  @Test
  void handlesNullWidgetFieldsInQueryResultMapping() {
    TodayQueryResult queryResultWithNullWidgets =
        new TodayQueryResult(
            Instant.now(),
            "UTC",
            LocalDate.now(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null);

    TodayResponse response = TodayResponse.fromQueryResult(queryResultWithNullWidgets);

    assertThat(response).isNotNull();
    assertThat(response.mit().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.currentNextBlock().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.tasks().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.schedule().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.overdue().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.focusSummary().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.sprint().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.week().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.activeProjects().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.review().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.brainDump().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.habits().status()).isEqualTo(WidgetStatus.EMPTY);
    assertThat(response.metrics().status()).isEqualTo(WidgetStatus.EMPTY);
  }

  @Test
  void handlesNullListsInQueryResultDataMapping() {
    TodayQueryResult queryResultWithNullLists =
        new TodayQueryResult(
            Instant.now(),
            "UTC",
            LocalDate.now(),
            TodayQueryResult.MitWidget.success(null),
            TodayQueryResult.CurrentNextBlockWidget.success(null),
            TodayQueryResult.TasksWidget.success(new TodayQueryResult.TasksData(null)),
            TodayQueryResult.ScheduleWidget.success(new TodayQueryResult.ScheduleData(null, null)),
            TodayQueryResult.OverdueWidget.success(new TodayQueryResult.OverdueData(0, null)),
            TodayQueryResult.FocusSummaryWidget.success(null),
            TodayQueryResult.SprintWidget.success(null),
            TodayQueryResult.WeekWidget.success(new TodayQueryResult.WeekData(0, 0, null)),
            TodayQueryResult.ActiveProjectsWidget.success(
                new TodayQueryResult.ActiveProjectsData(null)),
            TodayQueryResult.ReviewWidget.success(null),
            TodayQueryResult.BrainDumpWidget.success(null),
            TodayQueryResult.HabitsWidget.success(new TodayQueryResult.HabitsData(null)),
            TodayQueryResult.MetricsWidget.success(new TodayQueryResult.MetricsData(null)));

    TodayResponse response = TodayResponse.fromQueryResult(queryResultWithNullLists);

    assertThat(response).isNotNull();
    assertThat(response.tasks().data().tasks()).isEmpty();
    assertThat(response.schedule().data().blocks()).isEmpty();
    assertThat(response.schedule().data().conflicts()).isEmpty();
    assertThat(response.overdue().data().topOverdueTasks()).isEmpty();
    assertThat(response.week().data().outcomes()).isEmpty();
    assertThat(response.activeProjects().data().projects()).isEmpty();
    assertThat(response.habits().data().habits()).isEmpty();
    assertThat(response.metrics().data().metrics()).isEmpty();
  }
}
