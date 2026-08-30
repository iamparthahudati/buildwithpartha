package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.habit.HabitTodayProjectionProvider;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.HabitsData;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.HabitsWidget;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.TodayHabitDto;
import tech.buildwithpartha.lifeos.report.application.provider.HabitsWidgetProvider;

/** Provider for the Today Habit widget, backed by canonical owner-scoped Habit state. */
@Component
public class DefaultHabitsWidgetProvider implements HabitsWidgetProvider {

  private final HabitTodayProjectionProvider habitTodayProjectionProvider;

  public DefaultHabitsWidgetProvider(HabitTodayProjectionProvider habitTodayProjectionProvider) {
    this.habitTodayProjectionProvider =
        Objects.requireNonNull(
            habitTodayProjectionProvider, "habitTodayProjectionProvider must not be null");
  }

  @Override
  public HabitsWidget getWidget(UUID userId, LocalDate localDate, ZoneId zoneId) {
    var habits =
        habitTodayProjectionProvider.getTodayHabits(userId).stream()
            .map(
                habit ->
                    new TodayHabitDto(
                        habit.id(),
                        habit.name(),
                        habit.cadence(),
                        habit.targetCount(),
                        habit.completedCount(),
                        habit.localDate(),
                        habit.timeZone(),
                        habit.paused(),
                        habit.currentStreak()))
            .toList();
    return habits.isEmpty() ? HabitsWidget.empty() : HabitsWidget.success(new HabitsData(habits));
  }
}
