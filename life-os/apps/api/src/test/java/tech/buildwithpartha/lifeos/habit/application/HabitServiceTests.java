package tech.buildwithpartha.lifeos.habit.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;
import tech.buildwithpartha.lifeos.habit.domain.HabitDomainFixture;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriodRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;

@DisplayName("HabitService unit tests")
class HabitServiceTests {

  // 2026-02-01T15:00Z is 2026-02-01 10:00 in America/New_York (the sample habit's zone).
  private static final Instant FIXED_NOW = Instant.parse("2026-02-01T15:00:00Z");
  private static final LocalDate NY_TODAY = LocalDate.of(2026, 2, 1);

  private HabitRepository habitRepository;
  private HabitEntryRepository entryRepository;
  private HabitPausePeriodRepository pauseRepository;
  private HabitService service;

  private final UUID userId = HabitDomainFixture.USER_ID;
  private final UUID otherUserId = HabitDomainFixture.OTHER_USER_ID;

  @BeforeEach
  void setUp() {
    habitRepository = mock(HabitRepository.class);
    entryRepository = mock(HabitEntryRepository.class);
    pauseRepository = mock(HabitPausePeriodRepository.class);
    Clock clock = Clock.fixed(FIXED_NOW, ZoneId.of("UTC"));
    service = new HabitService(habitRepository, entryRepository, pauseRepository, clock);

    when(habitRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(entryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(pauseRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
  }

  private Habit ownedHabit() {
    Habit habit = HabitDomainFixture.sampleDailyHabit();
    when(habitRepository.findByIdAndUserId(habit.id(), userId)).thenReturn(Optional.of(habit));
    return habit;
  }

  @Nested
  @DisplayName("Habit CRUD")
  class HabitCrud {

    @Test
    @DisplayName("createHabit persists an unarchived habit for the user")
    void createHabit() {
      CreateHabitCommand command =
          new CreateHabitCommand(
              "Meditate",
              Optional.of("10 minutes"),
              HabitCadence.DAILY,
              1,
              "Europe/London",
              Optional.of("#00AA88"),
              false,
              Optional.empty());

      Habit created = service.createHabit(userId, command);

      assertThat(created.userId()).isEqualTo(userId);
      assertThat(created.name()).isEqualTo("Meditate");
      assertThat(created.archived()).isFalse();
      assertThat(created.version()).isZero();
      verify(habitRepository).save(any(Habit.class));
    }

    @Test
    @DisplayName("getHabit for a habit owned by another user is reported as not found")
    void getHabitCrossUser() {
      Habit habit = HabitDomainFixture.sampleDailyHabit();
      when(habitRepository.findByIdAndUserId(habit.id(), otherUserId)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.getHabit(otherUserId, habit.id()))
          .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("updateHabit with a stale version raises a concurrency conflict")
    void updateHabitVersionConflict() {
      Habit habit = ownedHabit();
      UpdateHabitCommand command =
          new UpdateHabitCommand(
              "Renamed",
              Optional.empty(),
              HabitCadence.WEEKLY,
              2,
              habit.timeZone(),
              Optional.empty(),
              false,
              Optional.empty());

      assertThatThrownBy(() -> service.updateHabit(userId, habit.id(), command, 99L))
          .isInstanceOf(ConcurrencyConflictException.class);
      verify(habitRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateHabit applies new details when the version matches")
    void updateHabitSuccess() {
      Habit habit = ownedHabit();
      UpdateHabitCommand command =
          new UpdateHabitCommand(
              "Renamed",
              Optional.of("new"),
              HabitCadence.WEEKLY,
              3,
              "UTC",
              Optional.of("#111111"),
              true,
              Optional.of(java.time.LocalTime.of(7, 30)));

      Habit updated = service.updateHabit(userId, habit.id(), command, habit.version());

      assertThat(updated.name()).isEqualTo("Renamed");
      assertThat(updated.cadence()).isEqualTo(HabitCadence.WEEKLY);
      assertThat(updated.targetCount()).isEqualTo(3);
      assertThat(updated.reminderEnabled()).isTrue();
      assertThat(updated.updatedAt()).isEqualTo(FIXED_NOW);
    }

    @Test
    @DisplayName("archiveHabit and restoreHabit flip the archived flag")
    void archiveAndRestore() {
      Habit habit = ownedHabit();

      Habit archived = service.archiveHabit(userId, habit.id(), habit.version());
      assertThat(archived.archived()).isTrue();

      when(habitRepository.findByIdAndUserId(habit.id(), userId)).thenReturn(Optional.of(archived));
      Habit restored = service.restoreHabit(userId, habit.id(), archived.version());
      assertThat(restored.archived()).isFalse();
    }

    @Test
    @DisplayName("deleteHabit cascades entries and pause periods before deleting the habit")
    void deleteCascades() {
      Habit habit = ownedHabit();
      HabitEntry entry = HabitDomainFixture.sampleEntry(habit.id());
      HabitPausePeriod pause = HabitDomainFixture.samplePausePeriod(habit.id());
      when(entryRepository.findByHabitId(habit.id())).thenReturn(List.of(entry));
      when(pauseRepository.findByHabitId(habit.id())).thenReturn(List.of(pause));

      service.deleteHabit(userId, habit.id());

      verify(entryRepository).delete(entry);
      verify(pauseRepository).delete(pause);
      verify(habitRepository).delete(habit);
    }
  }

  @Nested
  @DisplayName("Completion entries")
  class Entries {

    @Test
    @DisplayName("recordCompletion creates a new entry on the habit's own today when none exists")
    void recordCompletionCreatesToday() {
      Habit habit = ownedHabit();
      when(entryRepository.findByHabitIdAndLocalDate(habit.id(), NY_TODAY))
          .thenReturn(Optional.empty());

      HabitEntry entry = service.recordCompletion(userId, habit.id(), Optional.empty(), 1);

      assertThat(entry.localDate()).isEqualTo(NY_TODAY);
      assertThat(entry.completedCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("recordCompletion increments the single existing entry for the local date")
    void recordCompletionIncrementsExisting() {
      Habit habit = ownedHabit();
      HabitEntry existing =
          new HabitEntry(
              UUID.randomUUID(), habit.id(), userId, NY_TODAY, 2, FIXED_NOW, FIXED_NOW, 4L);
      when(entryRepository.findByHabitIdAndLocalDate(habit.id(), NY_TODAY))
          .thenReturn(Optional.of(existing));

      HabitEntry entry = service.recordCompletion(userId, habit.id(), Optional.empty(), 3);

      assertThat(entry.completedCount()).isEqualTo(5);
      ArgumentCaptor<HabitEntry> captor = ArgumentCaptor.forClass(HabitEntry.class);
      verify(entryRepository).save(captor.capture());
      assertThat(captor.getValue().id()).isEqualTo(existing.id());
    }

    @Test
    @DisplayName("setCount overwrites the completed count for an explicit date")
    void setCountOverwrites() {
      Habit habit = ownedHabit();
      LocalDate date = LocalDate.of(2026, 1, 20);
      HabitEntry existing =
          new HabitEntry(UUID.randomUUID(), habit.id(), userId, date, 7, FIXED_NOW, FIXED_NOW, 1L);
      when(entryRepository.findByHabitIdAndLocalDate(habit.id(), date))
          .thenReturn(Optional.of(existing));

      HabitEntry entry = service.setCount(userId, habit.id(), Optional.of(date), 2);

      assertThat(entry.completedCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("removeEntry deletes an existing entry and is a no-op when absent")
    void removeEntry() {
      Habit habit = ownedHabit();
      LocalDate date = LocalDate.of(2026, 1, 20);
      HabitEntry existing =
          new HabitEntry(UUID.randomUUID(), habit.id(), userId, date, 1, FIXED_NOW, FIXED_NOW, 0L);
      when(entryRepository.findByHabitIdAndLocalDate(habit.id(), date))
          .thenReturn(Optional.of(existing));

      service.removeEntry(userId, habit.id(), Optional.of(date));
      verify(entryRepository).delete(existing);

      // Absent entry: a no-op — delete is still only ever the single call above.
      when(entryRepository.findByHabitIdAndLocalDate(habit.id(), NY_TODAY))
          .thenReturn(Optional.empty());
      service.removeEntry(userId, habit.id(), Optional.empty());
      verify(entryRepository, org.mockito.Mockito.times(1)).delete(any());
    }

    @Test
    @DisplayName("listToday returns entries for the habit's own today")
    void listToday() {
      Habit habit = ownedHabit();
      HabitEntry entry =
          new HabitEntry(
              UUID.randomUUID(), habit.id(), userId, NY_TODAY, 1, FIXED_NOW, FIXED_NOW, 0L);
      when(entryRepository.findByHabitIdAndLocalDateBetween(habit.id(), NY_TODAY, NY_TODAY))
          .thenReturn(List.of(entry));

      assertThat(service.listToday(userId, habit.id())).containsExactly(entry);
    }
  }

  @Nested
  @DisplayName("Pause periods")
  class Pauses {

    @Test
    @DisplayName("addPause persists an open-ended pause")
    void addPause() {
      Habit habit = ownedHabit();

      HabitPausePeriod pause =
          service.addPause(
              userId, habit.id(), LocalDate.of(2026, 2, 1), Optional.empty(), Optional.of("Trip"));

      assertThat(pause.habitId()).isEqualTo(habit.id());
      assertThat(pause.endDate()).isEmpty();
      assertThat(pause.reason()).contains("Trip");
    }

    @Test
    @DisplayName("removePause for another habit's pause is reported as not found")
    void removePauseWrongHabit() {
      Habit habit = ownedHabit();
      HabitPausePeriod pause = HabitDomainFixture.samplePausePeriod(UUID.randomUUID());
      when(pauseRepository.findById(pause.id())).thenReturn(Optional.of(pause));

      assertThatThrownBy(() -> service.removePause(userId, habit.id(), pause.id()))
          .isInstanceOf(ResourceNotFoundException.class);
      verify(pauseRepository, never()).delete(any());
    }
  }

  @Nested
  @DisplayName("Statistics")
  class Statistics {

    @Test
    @DisplayName("statistics aggregates completions and target-meeting days over the window")
    void statistics() {
      Habit habit = ownedHabit(); // targetCount = 8
      LocalDate from = LocalDate.of(2026, 2, 1);
      LocalDate to = LocalDate.of(2026, 2, 5); // 5 days inclusive
      List<HabitEntry> entries =
          List.of(
              new HabitEntry(
                  UUID.randomUUID(), habit.id(), userId, from, 8, FIXED_NOW, FIXED_NOW, 0L),
              new HabitEntry(
                  UUID.randomUUID(),
                  habit.id(),
                  userId,
                  LocalDate.of(2026, 2, 3),
                  3,
                  FIXED_NOW,
                  FIXED_NOW,
                  0L));
      when(entryRepository.findByHabitIdAndLocalDateBetween(habit.id(), from, to))
          .thenReturn(entries);

      HabitStatistics stats = service.statistics(userId, habit.id(), from, to);

      assertThat(stats.totalDays()).isEqualTo(5);
      assertThat(stats.daysWithEntry()).isEqualTo(2);
      assertThat(stats.daysMeetingTarget()).isEqualTo(1);
      assertThat(stats.totalCompletions()).isEqualTo(11);
      assertThat(stats.completionRate()).isEqualTo(1.0 / 5.0);
      assertThat(stats.streak().currentStreak()).isZero();
      assertThat(stats.streak().longestStreak()).isEqualTo(1);
      assertThat(stats.streak().eligiblePeriods()).isEqualTo(5);
      assertThat(stats.streak().metTargetPeriods()).isEqualTo(1);
      assertThat(stats.streak().completionRate()).isEqualTo(1.0 / 5.0);
    }

    @Test
    @DisplayName("entry and statistics ranges are limited to 366 local dates")
    void boundedRanges() {
      Habit habit = ownedHabit();
      LocalDate from = LocalDate.of(2025, 1, 1);
      LocalDate to = LocalDate.of(2026, 1, 2);

      assertThatThrownBy(() -> service.listEntries(userId, habit.id(), from, to))
          .isInstanceOf(FieldValidationException.class);
      assertThatThrownBy(() -> service.statistics(userId, habit.id(), from, to))
          .isInstanceOf(FieldValidationException.class);
    }
  }
}
