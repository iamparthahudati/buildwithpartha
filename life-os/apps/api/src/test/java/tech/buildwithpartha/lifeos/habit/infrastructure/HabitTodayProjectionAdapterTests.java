package tech.buildwithpartha.lifeos.habit.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.habit.HabitTodayProjection;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitDomainFixture;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriodRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;

@DisplayName("Habit Today projection adapter")
class HabitTodayProjectionAdapterTests {

  private static final Instant NOW = Instant.parse("2026-02-01T15:00:00Z");

  private HabitRepository habitRepository;
  private HabitEntryRepository entryRepository;
  private HabitPausePeriodRepository pauseRepository;
  private HabitTodayProjectionAdapter adapter;

  @BeforeEach
  void setUp() {
    habitRepository = mock(HabitRepository.class);
    entryRepository = mock(HabitEntryRepository.class);
    pauseRepository = mock(HabitPausePeriodRepository.class);
    adapter =
        new HabitTodayProjectionAdapter(
            habitRepository, entryRepository, pauseRepository, Clock.fixed(NOW, ZoneOffset.UTC));
  }

  @Test
  void returnsOwnerScopedCountsLocalDatePauseAndAuthoritativeStreak() {
    Habit habit = HabitDomainFixture.sampleDailyHabit();
    LocalDate today = LocalDate.of(2026, 2, 1);
    HabitEntry yesterday =
        entry(habit, today.minusDays(1), 8, "40000000-0000-0000-0000-000000000001");
    HabitEntry todayEntry = entry(habit, today, 8, "40000000-0000-0000-0000-000000000002");
    HabitPausePeriod pause =
        new HabitPausePeriod(
            HabitDomainFixture.PAUSE_ID,
            habit.id(),
            habit.userId(),
            today,
            Optional.of(today),
            Optional.empty(),
            NOW);

    when(habitRepository.findByUserIdAndArchived(HabitDomainFixture.USER_ID, false))
        .thenReturn(List.of(habit));
    when(entryRepository.findByHabitId(habit.id())).thenReturn(List.of(yesterday, todayEntry));
    when(pauseRepository.findByHabitId(habit.id())).thenReturn(List.of(pause));

    List<HabitTodayProjection> result = adapter.getTodayHabits(HabitDomainFixture.USER_ID);

    assertThat(result)
        .singleElement()
        .satisfies(
            projection -> {
              assertThat(projection.id()).isEqualTo(habit.id());
              assertThat(projection.completedCount()).isEqualTo(8);
              assertThat(projection.localDate()).isEqualTo(today);
              assertThat(projection.timeZone()).isEqualTo("America/New_York");
              assertThat(projection.paused()).isTrue();
              assertThat(projection.currentStreak()).isEqualTo(1);
            });
    verify(habitRepository).findByUserIdAndArchived(HabitDomainFixture.USER_ID, false);
  }

  private static HabitEntry entry(Habit habit, LocalDate date, int count, String id) {
    return new HabitEntry(
        UUID.fromString(id), habit.id(), habit.userId(), date, count, NOW, NOW, 0L);
  }
}
