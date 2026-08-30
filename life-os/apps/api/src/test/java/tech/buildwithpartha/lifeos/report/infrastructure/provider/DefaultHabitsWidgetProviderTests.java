package tech.buildwithpartha.lifeos.report.infrastructure.provider;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.habit.HabitTodayProjection;
import tech.buildwithpartha.lifeos.report.application.TodayQueryResult.HabitsWidget;
import tech.buildwithpartha.lifeos.report.domain.WidgetStatus;

class DefaultHabitsWidgetProviderTests {

  @Test
  void mapsCanonicalHabitProjectionIntoTodayContract() {
    UUID id = UUID.fromString("10000000-0000-0000-0000-000000000001");
    LocalDate date = LocalDate.of(2026, 8, 30);
    DefaultHabitsWidgetProvider provider =
        new DefaultHabitsWidgetProvider(
            userId ->
                List.of(
                    new HabitTodayProjection(
                        id, "Read", "DAILY", 2, 1, date, "Asia/Kolkata", false, 4)));

    HabitsWidget widget = provider.getWidget(UUID.randomUUID(), date, ZoneId.of("Asia/Kolkata"));

    assertThat(widget.status()).isEqualTo(WidgetStatus.SUCCESS);
    assertThat(widget.data().habits())
        .singleElement()
        .satisfies(
            habit -> {
              assertThat(habit.id()).isEqualTo(id);
              assertThat(habit.name()).isEqualTo("Read");
              assertThat(habit.completedCount()).isEqualTo(1);
              assertThat(habit.targetCount()).isEqualTo(2);
              assertThat(habit.localDate()).isEqualTo(date);
              assertThat(habit.currentStreak()).isEqualTo(4);
            });
  }
}
