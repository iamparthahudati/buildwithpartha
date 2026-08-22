package tech.buildwithpartha.lifeos.report.application;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.user.UserTimeZoneProvider;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ActiveProjectsWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.BrainDumpWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.CurrentNextBlockWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.FocusSummaryWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.HabitsWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MetricsWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.MitWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.OverdueWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ReviewWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.ScheduleWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.SprintWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TasksWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.WeekWidget;
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

/** Application service orchestrating modular Today dashboard aggregation (LOS-0607). */
@Service
public class TodayService {

  private static final Logger log = LoggerFactory.getLogger(TodayService.class);
  private static final String DEFAULT_TIME_ZONE = "UTC";

  private final UserTimeZoneProvider userTimeZoneProvider;
  private final Clock clock;
  private final MitWidgetProvider mitWidgetProvider;
  private final CurrentNextBlockWidgetProvider currentNextBlockWidgetProvider;
  private final TasksWidgetProvider tasksWidgetProvider;
  private final ScheduleWidgetProvider scheduleWidgetProvider;
  private final OverdueWidgetProvider overdueWidgetProvider;
  private final FocusSummaryWidgetProvider focusSummaryWidgetProvider;
  private final SprintWidgetProvider sprintWidgetProvider;
  private final WeekWidgetProvider weekWidgetProvider;
  private final ActiveProjectsWidgetProvider activeProjectsWidgetProvider;
  private final ReviewWidgetProvider reviewWidgetProvider;
  private final BrainDumpWidgetProvider brainDumpWidgetProvider;
  private final HabitsWidgetProvider habitsWidgetProvider;
  private final MetricsWidgetProvider metricsWidgetProvider;

  public TodayService(
      UserTimeZoneProvider userTimeZoneProvider,
      Clock clock,
      MitWidgetProvider mitWidgetProvider,
      CurrentNextBlockWidgetProvider currentNextBlockWidgetProvider,
      TasksWidgetProvider tasksWidgetProvider,
      ScheduleWidgetProvider scheduleWidgetProvider,
      OverdueWidgetProvider overdueWidgetProvider,
      FocusSummaryWidgetProvider focusSummaryWidgetProvider,
      SprintWidgetProvider sprintWidgetProvider,
      WeekWidgetProvider weekWidgetProvider,
      ActiveProjectsWidgetProvider activeProjectsWidgetProvider,
      ReviewWidgetProvider reviewWidgetProvider,
      BrainDumpWidgetProvider brainDumpWidgetProvider,
      HabitsWidgetProvider habitsWidgetProvider,
      MetricsWidgetProvider metricsWidgetProvider) {
    this.userTimeZoneProvider = userTimeZoneProvider;
    this.clock = clock;
    this.mitWidgetProvider = mitWidgetProvider;
    this.currentNextBlockWidgetProvider = currentNextBlockWidgetProvider;
    this.tasksWidgetProvider = tasksWidgetProvider;
    this.scheduleWidgetProvider = scheduleWidgetProvider;
    this.overdueWidgetProvider = overdueWidgetProvider;
    this.focusSummaryWidgetProvider = focusSummaryWidgetProvider;
    this.sprintWidgetProvider = sprintWidgetProvider;
    this.weekWidgetProvider = weekWidgetProvider;
    this.activeProjectsWidgetProvider = activeProjectsWidgetProvider;
    this.reviewWidgetProvider = reviewWidgetProvider;
    this.brainDumpWidgetProvider = brainDumpWidgetProvider;
    this.habitsWidgetProvider = habitsWidgetProvider;
    this.metricsWidgetProvider = metricsWidgetProvider;
  }

  public TodayQueryResult getToday(UUID userId) {
    String rawTimeZone = userTimeZoneProvider.getUserTimeZone(userId);
    ZoneId parsedZone;
    String parsedStr;

    try {
      parsedZone = ZoneId.of(rawTimeZone);
      parsedStr = rawTimeZone;
    } catch (Exception e) {
      log.warn("Invalid timezone '{}' for user {}, falling back to UTC", rawTimeZone, userId);
      parsedZone = ZoneId.of(DEFAULT_TIME_ZONE);
      parsedStr = DEFAULT_TIME_ZONE;
    }

    final String timeZoneStr = parsedStr;
    final ZoneId zoneId = parsedZone;

    LocalDate localDate = clock.instant().atZone(zoneId).toLocalDate();

    MitWidget mit =
        safeFetch(
            () -> mitWidgetProvider.getWidget(userId, localDate, zoneId),
            MitWidget.error("Provider execution failed"));

    CurrentNextBlockWidget currentNextBlock =
        safeFetch(
            () -> currentNextBlockWidgetProvider.getWidget(userId, localDate, zoneId),
            CurrentNextBlockWidget.error("Provider execution failed"));

    TasksWidget tasks =
        safeFetch(
            () -> tasksWidgetProvider.getWidget(userId, localDate, zoneId),
            TasksWidget.error("Provider execution failed"));

    ScheduleWidget schedule =
        safeFetch(
            () -> scheduleWidgetProvider.getWidget(userId, localDate, zoneId),
            ScheduleWidget.error("Provider execution failed"));

    OverdueWidget overdue =
        safeFetch(
            () -> overdueWidgetProvider.getWidget(userId, localDate, zoneId),
            OverdueWidget.error("Provider execution failed"));

    FocusSummaryWidget focusSummary =
        safeFetch(
            () -> focusSummaryWidgetProvider.getWidget(userId, localDate, zoneId),
            FocusSummaryWidget.error("Provider execution failed"));

    SprintWidget sprint =
        safeFetch(
            () -> sprintWidgetProvider.getWidget(userId, localDate, zoneId),
            SprintWidget.error("Provider execution failed"));

    WeekWidget week =
        safeFetch(
            () -> weekWidgetProvider.getWidget(userId, localDate, zoneId),
            WeekWidget.error("Provider execution failed"));

    ActiveProjectsWidget activeProjects =
        safeFetch(
            () -> activeProjectsWidgetProvider.getWidget(userId, localDate, zoneId),
            ActiveProjectsWidget.error("Provider execution failed"));

    ReviewWidget review =
        safeFetch(
            () -> reviewWidgetProvider.getWidget(userId, localDate, zoneId),
            ReviewWidget.error("Provider execution failed"));

    BrainDumpWidget brainDump =
        safeFetch(
            () -> brainDumpWidgetProvider.getWidget(userId, localDate, zoneId),
            BrainDumpWidget.error("Provider execution failed"));

    HabitsWidget habits =
        safeFetch(
            () -> habitsWidgetProvider.getWidget(userId, localDate, zoneId),
            HabitsWidget.error("Provider execution failed"));

    MetricsWidget metrics =
        safeFetch(
            () -> metricsWidgetProvider.getWidget(userId, localDate, zoneId),
            MetricsWidget.error("Provider execution failed"));

    return new TodayQueryResult(
        clock.instant(),
        timeZoneStr,
        localDate,
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
  }

  private <T> T safeFetch(Supplier<T> supplier, T errorFallback) {
    try {
      return supplier.get();
    } catch (Exception e) {
      log.error("Widget provider failed during Today aggregation", e);
      return errorFallback;
    }
  }
}
