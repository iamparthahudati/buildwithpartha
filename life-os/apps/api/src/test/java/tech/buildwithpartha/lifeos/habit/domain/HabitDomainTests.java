package tech.buildwithpartha.lifeos.habit.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class HabitDomainTests {

  @Nested
  @DisplayName("Habit invariants")
  class HabitInvariantTests {

    @Test
    void validHabitIsCreatedSuccessfully() {
      Habit habit = HabitDomainFixture.sampleDailyHabit();

      assertThat(habit.name()).isEqualTo("Drink water");
      assertThat(habit.cadence()).isEqualTo(HabitCadence.DAILY);
      assertThat(habit.targetCount()).isEqualTo(8);
      assertThat(habit.reminderEnabled()).isTrue();
      assertThat(habit.reminderTime()).contains(LocalTime.of(9, 0));
      assertThat(habit.isOwnedBy(HabitDomainFixture.USER_ID)).isTrue();
      assertThat(habit.isOwnedBy(HabitDomainFixture.OTHER_USER_ID)).isFalse();
    }

    @Test
    void throwsWhenNameIsBlank() {
      assertThatThrownBy(() -> newHabit("   ", 1, "UTC", false, Optional.empty()))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Habit name must not be blank");
    }

    @Test
    void throwsWhenTargetCountIsNotPositive() {
      assertThatThrownBy(() -> newHabit("Valid", 0, "UTC", false, Optional.empty()))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Habit targetCount must be positive");
    }

    @Test
    void throwsWhenTimeZoneIsInvalid() {
      assertThatThrownBy(() -> newHabit("Valid", 1, "Not/AZone", false, Optional.empty()))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("Habit timeZone must be a valid IANA zone id");
    }

    @Test
    void throwsWhenReminderEnabledWithoutTime() {
      assertThatThrownBy(() -> newHabit("Valid", 1, "UTC", true, Optional.empty()))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("reminderTime");
    }

    @Test
    void archiveAndRestoreFlipArchivedAndTouchUpdatedAt() {
      Habit habit = HabitDomainFixture.sampleDailyHabit();
      Instant later = Instant.parse("2026-05-01T00:00:00Z");

      Habit archived = habit.archive(later);
      assertThat(archived.archived()).isTrue();
      assertThat(archived.updatedAt()).isEqualTo(later);
      assertThat(archived.createdAt()).isEqualTo(habit.createdAt());

      Habit restored = archived.restore(later);
      assertThat(restored.archived()).isFalse();
    }
  }

  @Nested
  @DisplayName("Timezone-safe local date bucketing")
  class TimezoneTests {

    @Test
    void bucketsInstantIntoHabitLocalDate() {
      // 2026-02-01T03:00:00Z is still 2026-01-31 in New York (UTC-5).
      Habit habit = HabitDomainFixture.sampleDailyHabit();
      Instant instant = Instant.parse("2026-02-01T03:00:00Z");

      assertThat(habit.localDateFor(instant)).isEqualTo(LocalDate.of(2026, 1, 31));
    }

    @Test
    void sameInstantMapsToDifferentDatesAcrossZones() {
      Instant instant = Instant.parse("2026-02-01T03:00:00Z");

      Habit newYork = HabitDomainFixture.sampleDailyHabit();
      Habit utc = HabitDomainFixture.sampleWeeklyHabit();

      assertThat(newYork.localDateFor(instant)).isEqualTo(LocalDate.of(2026, 1, 31));
      assertThat(utc.localDateFor(instant)).isEqualTo(LocalDate.of(2026, 2, 1));
    }
  }

  @Nested
  @DisplayName("HabitEntry invariants")
  class HabitEntryTests {

    @Test
    void throwsWhenCompletedCountIsNotPositive() {
      assertThatThrownBy(
              () ->
                  new HabitEntry(
                      UUID.randomUUID(),
                      HabitDomainFixture.HABIT_ID,
                      HabitDomainFixture.USER_ID,
                      LocalDate.of(2026, 2, 1),
                      0,
                      Instant.now(),
                      Instant.now(),
                      0L))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("completedCount must be positive");
    }

    @Test
    void incrementAddsToCountAndTouchesUpdatedAt() {
      HabitEntry entry = HabitDomainFixture.sampleEntry(HabitDomainFixture.HABIT_ID);
      Instant later = Instant.parse("2026-02-01T18:00:00Z");

      HabitEntry incremented = entry.increment(2, later);
      assertThat(incremented.completedCount()).isEqualTo(5);
      assertThat(incremented.updatedAt()).isEqualTo(later);
      assertThat(incremented.localDate()).isEqualTo(entry.localDate());
    }

    @Test
    void incrementRejectsNonPositiveDelta() {
      HabitEntry entry = HabitDomainFixture.sampleEntry(HabitDomainFixture.HABIT_ID);
      assertThatThrownBy(() -> entry.increment(0, Instant.now()))
          .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void withCountReplacesCount() {
      HabitEntry entry = HabitDomainFixture.sampleEntry(HabitDomainFixture.HABIT_ID);
      assertThat(entry.withCount(1, Instant.now()).completedCount()).isEqualTo(1);
    }
  }

  @Nested
  @DisplayName("HabitPausePeriod invariants")
  class PausePeriodTests {

    @Test
    void throwsWhenEndDatePrecedesStartDate() {
      assertThatThrownBy(
              () ->
                  new HabitPausePeriod(
                      UUID.randomUUID(),
                      HabitDomainFixture.HABIT_ID,
                      HabitDomainFixture.USER_ID,
                      LocalDate.of(2026, 3, 10),
                      Optional.of(LocalDate.of(2026, 3, 1)),
                      Optional.empty(),
                      Instant.now()))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("endDate must not precede startDate");
    }

    @Test
    void coversInclusiveRange() {
      HabitPausePeriod pause = HabitDomainFixture.samplePausePeriod(HabitDomainFixture.HABIT_ID);

      assertThat(pause.covers(LocalDate.of(2026, 2, 28))).isFalse();
      assertThat(pause.covers(LocalDate.of(2026, 3, 1))).isTrue();
      assertThat(pause.covers(LocalDate.of(2026, 3, 5))).isTrue();
      assertThat(pause.covers(LocalDate.of(2026, 3, 10))).isTrue();
      assertThat(pause.covers(LocalDate.of(2026, 3, 11))).isFalse();
    }

    @Test
    void openEndedPauseCoversAllDatesFromStart() {
      HabitPausePeriod openEnded =
          new HabitPausePeriod(
              UUID.randomUUID(),
              HabitDomainFixture.HABIT_ID,
              HabitDomainFixture.USER_ID,
              LocalDate.of(2026, 3, 1),
              Optional.empty(),
              Optional.empty(),
              Instant.now());

      assertThat(openEnded.covers(LocalDate.of(2026, 2, 28))).isFalse();
      assertThat(openEnded.covers(LocalDate.of(2030, 1, 1))).isTrue();
    }
  }

  private static Habit newHabit(
      String name,
      int targetCount,
      String timeZone,
      boolean reminderEnabled,
      Optional<LocalTime> reminderTime) {
    return new Habit(
        UUID.randomUUID(),
        HabitDomainFixture.USER_ID,
        name,
        Optional.empty(),
        HabitCadence.DAILY,
        targetCount,
        timeZone,
        Optional.empty(),
        reminderEnabled,
        reminderTime,
        false,
        Instant.now(),
        Instant.now(),
        0L);
  }
}
