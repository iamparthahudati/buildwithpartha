package tech.buildwithpartha.lifeos.task.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RecurrenceOccurrenceEngineTests {

  private static final UUID USER_ID = UUID.randomUUID();
  private static final Instant NOW = Instant.parse("2026-09-01T08:00:00Z");

  @Test
  @DisplayName("Returns empty list when horizon is before start date")
  void returnsEmptyWhenHorizonBeforeStartDate() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.DAILY,
            1,
            null,
            null,
            RecurrenceEndMode.NEVER,
            null,
            null,
            LocalDate.of(2026, 9, 10));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2026, 9, 5));

    assertThat(dates).isEmpty();
  }

  @Test
  @DisplayName("Generates daily occurrences until horizon")
  void generatesDailyOccurrences() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.DAILY,
            1,
            null,
            null,
            RecurrenceEndMode.NEVER,
            null,
            null,
            LocalDate.of(2026, 9, 1));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2026, 9, 5));

    assertThat(dates)
        .containsExactly(
            LocalDate.of(2026, 9, 1),
            LocalDate.of(2026, 9, 2),
            LocalDate.of(2026, 9, 3),
            LocalDate.of(2026, 9, 4),
            LocalDate.of(2026, 9, 5));
  }

  @Test
  @DisplayName("Generates interval occurrences every 3 days")
  void generatesIntervalOccurrences() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.INTERVAL,
            3,
            null,
            null,
            RecurrenceEndMode.NEVER,
            null,
            null,
            LocalDate.of(2026, 9, 1));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2026, 9, 10));

    assertThat(dates)
        .containsExactly(
            LocalDate.of(2026, 9, 1),
            LocalDate.of(2026, 9, 4),
            LocalDate.of(2026, 9, 7),
            LocalDate.of(2026, 9, 10));
  }

  @Test
  @DisplayName("Generates weekday occurrences skipping weekends")
  void generatesWeekdayOccurrences() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.WEEKDAY,
            1,
            null,
            null,
            RecurrenceEndMode.NEVER,
            null,
            null,
            LocalDate.of(2026, 9, 4)); // Friday

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(
            series, LocalDate.of(2026, 9, 8)); // Tuesday

    assertThat(dates)
        .containsExactly(
            LocalDate.of(2026, 9, 4), // Friday
            LocalDate.of(2026, 9, 7), // Monday
            LocalDate.of(2026, 9, 8)); // Tuesday
  }

  @Test
  @DisplayName("Generates weekly occurrences for specified days of week with malformed fallback")
  void generatesWeeklyOccurrences() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.WEEKLY,
            1,
            "MONDAY,INVALID_DAY,WEDNESDAY",
            null,
            RecurrenceEndMode.NEVER,
            null,
            null,
            LocalDate.of(2026, 9, 1)); // Tuesday

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2026, 9, 10));

    assertThat(dates)
        .containsExactly(
            LocalDate.of(2026, 9, 2), // Wednesday
            LocalDate.of(2026, 9, 7), // Monday
            LocalDate.of(2026, 9, 9)); // Wednesday
  }

  @Test
  @DisplayName("Generates monthly occurrences with month-end day clamping")
  void generatesMonthlyOccurrencesWithClamping() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.MONTHLY,
            1,
            null,
            31,
            RecurrenceEndMode.NEVER,
            null,
            null,
            LocalDate.of(2026, 1, 31));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2026, 4, 30));

    assertThat(dates)
        .containsExactly(
            LocalDate.of(2026, 1, 31),
            LocalDate.of(2026, 2, 28),
            LocalDate.of(2026, 3, 31),
            LocalDate.of(2026, 4, 30));
  }

  @Test
  @DisplayName("Generates after completion initial occurrence")
  void generatesAfterCompletionInitialOccurrence() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.AFTER_COMPLETION,
            2,
            null,
            null,
            RecurrenceEndMode.NEVER,
            null,
            null,
            LocalDate.of(2026, 9, 1));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2026, 9, 10));

    assertThat(dates).containsExactly(LocalDate.of(2026, 9, 1));
  }

  @Test
  @DisplayName("Respects UNTIL_DATE end mode when horizon is after endDate")
  void respectsUntilDateEndMode() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.DAILY,
            1,
            null,
            null,
            RecurrenceEndMode.UNTIL_DATE,
            LocalDate.of(2026, 9, 3),
            null,
            LocalDate.of(2026, 9, 1));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2026, 9, 10));

    assertThat(dates)
        .containsExactly(
            LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 2), LocalDate.of(2026, 9, 3));
  }

  @Test
  @DisplayName("Respects COUNT end mode")
  void respectsCountEndMode() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.DAILY,
            1,
            null,
            null,
            RecurrenceEndMode.COUNT,
            null,
            3,
            LocalDate.of(2026, 9, 1));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2026, 9, 10));

    assertThat(dates)
        .containsExactly(
            LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 2), LocalDate.of(2026, 9, 3));
  }

  // LOS-1505 additional boundary cases ─────────────────────────────────────

  @Test
  @DisplayName("Monthly day-28 across Feb 2024 (leap year) and Feb 2025 (non-leap)")
  void monthlyDay28AcrossLeapAndNonLeapFeb() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.MONTHLY,
            1,
            null,
            28,
            RecurrenceEndMode.NEVER,
            null,
            null,
            LocalDate.of(2024, 1, 28));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(series, LocalDate.of(2025, 3, 28));

    // day-28 always exists in every month; no clamping needed
    assertThat(dates)
        .contains(LocalDate.of(2024, 1, 28))
        .contains(LocalDate.of(2024, 2, 28)) // leap year but day 28 is valid as-is
        .contains(LocalDate.of(2024, 3, 28))
        .contains(LocalDate.of(2025, 2, 28)) // non-leap year; day 28 still valid
        .contains(LocalDate.of(2025, 3, 28));
    // Verify no date is Feb 29 (day-28 series must never produce Feb 29)
    assertThat(dates).doesNotContain(LocalDate.of(2024, 2, 29));
  }

  @Test
  @DisplayName("Monthly day-31 UNTIL_DATE ending exactly on Mar 31 includes last occurrence")
  void monthlyDay31UntilDateEndingOnMar31IncludesLast() {
    RecurringTaskSeries series =
        createSeries(
            RecurrenceFrequency.MONTHLY,
            1,
            null,
            31,
            RecurrenceEndMode.UNTIL_DATE,
            LocalDate.of(2026, 3, 31),
            null,
            LocalDate.of(2026, 1, 31));

    List<LocalDate> dates =
        RecurrenceOccurrenceEngine.generateOccurrenceDates(
            series, LocalDate.of(2026, 5, 31)); // horizon beyond end date

    // Feb 28 (non-leap clamping), then Mar 31 exactly at the end date
    assertThat(dates)
        .containsExactly(
            LocalDate.of(2026, 1, 31),
            LocalDate.of(2026, 2, 28), // clamped
            LocalDate.of(2026, 3, 31)) // exactly at UNTIL_DATE boundary — must be included
        .doesNotContain(LocalDate.of(2026, 4, 30)); // April occurrence must be excluded
  }

  private RecurringTaskSeries createSeries(
      RecurrenceFrequency frequency,
      int intervalValue,
      String daysOfWeek,
      Integer dayOfMonth,
      RecurrenceEndMode endMode,
      LocalDate endDate,
      Integer endCount,
      LocalDate startDate) {
    return new RecurringTaskSeries(
        UUID.randomUUID(),
        USER_ID,
        "Test Series",
        "Description",
        TaskStatus.TO_DO,
        TaskPriority.P2,
        null,
        30,
        frequency,
        intervalValue,
        daysOfWeek,
        dayOfMonth,
        endMode,
        endDate,
        endCount,
        startDate,
        "UTC",
        null,
        null,
        NOW,
        NOW,
        0L);
  }
}
