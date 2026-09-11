package tech.buildwithpartha.lifeos.task.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitCadence;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;
import tech.buildwithpartha.lifeos.habit.domain.HabitStreakCalculator;
import tech.buildwithpartha.lifeos.habit.domain.HabitStreakResult;

/**
 * LOS-1505: Timezone and Recurrence Matrix — pure domain test suite.
 *
 * <p>No Spring context, no database. Validates that the {@link RecurrenceOccurrenceEngine} and
 * {@link tech.buildwithpartha.lifeos.habit.domain.HabitStreakCalculator} produce correct {@link
 * LocalDate} occurrences across:
 *
 * <ul>
 *   <li>Section 1 — Timezone class correctness (DST-observing, DST-free, half-hour offset, UTC)
 *   <li>Section 2 — Midnight and year boundary correctness
 *   <li>Section 3 — Month-end and leap-year clamping
 *   <li>Section 4 — Week/year ISO boundary recurrence
 *   <li>Section 5 — Timezone change on recurring series
 *   <li>Section 6 — Habit streak correctness across DST spring-forward boundary
 * </ul>
 *
 * <p>Key invariant (AGENTS.md §Non-negotiable quality rules): "Use UTC in storage and APIs; convert
 * to the user's IANA timezone only at display/input boundaries." The recurrence engine operates on
 * {@link LocalDate} values that are already resolved to the user's timezone at the API boundary.
 * These tests validate that the engine's date arithmetic is correct for dates that were resolved
 * from each timezone class.
 */
@DisplayName("LOS-1505: Timezone and Recurrence Matrix")
class TimezoneRecurrenceMatrixIntegrationTests {

  private static final UUID USER_ID = UUID.fromString("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  private static final Instant T0 = Instant.parse("2026-01-01T00:00:00Z");

  // ---------------------------------------------------------------------------
  // Shared factory helpers
  // ---------------------------------------------------------------------------

  private static RecurringTaskSeries series(
      RecurrenceFrequency frequency,
      int intervalValue,
      String daysOfWeek,
      Integer dayOfMonth,
      RecurrenceEndMode endMode,
      LocalDate endDate,
      Integer endCount,
      LocalDate startDate,
      String timeZone) {
    return new RecurringTaskSeries(
        UUID.randomUUID(),
        USER_ID,
        "TZ Matrix Series",
        "Timezone and recurrence matrix test series",
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
        timeZone,
        null,
        null,
        T0,
        T0,
        0L);
  }

  private static Habit dailyHabit(String timeZone) {
    return new Habit(
        UUID.randomUUID(),
        USER_ID,
        "TZ Matrix Habit",
        Optional.empty(),
        HabitCadence.DAILY,
        1,
        timeZone,
        Optional.empty(),
        false,
        Optional.empty(),
        false,
        T0,
        T0,
        0L);
  }

  private static HabitEntry habitEntry(LocalDate date, int count) {
    return new HabitEntry(UUID.randomUUID(), UUID.randomUUID(), USER_ID, date, count, T0, T0, 0L);
  }

  private static HabitPausePeriod pause(LocalDate start, LocalDate end) {
    return new HabitPausePeriod(
        UUID.randomUUID(),
        UUID.randomUUID(),
        USER_ID,
        start,
        Optional.of(end),
        Optional.empty(),
        T0);
  }

  // ===========================================================================
  // Section 1 — Timezone class correctness
  // ===========================================================================

  @Nested
  @DisplayName("Section 1 — Timezone class correctness")
  class Section1TimezoneClassCorrectness {

    /**
     * DST-observing zone: America/New_York.
     *
     * <p>Spring-forward 2026: clocks move forward at 02:00 on 2026-03-08 (2nd Sunday in March),
     * skipping from 02:00 → 03:00. A daily recurrence series whose occurrences are resolved as
     * local dates in America/New_York must produce an unbroken daily sequence across the gap day;
     * the date "2026-03-08" still exists as a calendar day even though the local midnight is in the
     * DST transition — the engine works with LocalDate values, not wall-clock times.
     */
    @Test
    @DisplayName("DST spring-forward (America/New_York, 2026-03-08): daily series spans gap date")
    void dstSpringForwardAmericaNewYorkDailySeriesSpansGapDate() {
      // Daily series starting 3 days before spring-forward
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2026, 3, 5), // Thursday before spring-forward
              "America/New_York");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(
              s, LocalDate.of(2026, 3, 12)); // Thursday after spring-forward

      // Must include every calendar day including 2026-03-08 (spring-forward day)
      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 3, 5),
              LocalDate.of(2026, 3, 6),
              LocalDate.of(2026, 3, 7),
              LocalDate.of(2026, 3, 8), // spring-forward — must NOT be skipped
              LocalDate.of(2026, 3, 9),
              LocalDate.of(2026, 3, 10),
              LocalDate.of(2026, 3, 11),
              LocalDate.of(2026, 3, 12));
    }

    /**
     * DST fall-back 2026: America/New_York clocks move back at 02:00 on 2026-11-01 (1st Sunday in
     * November). A daily series must produce exactly one occurrence for 2026-11-01, even though the
     * wall-clock day is 25 hours long.
     */
    @Test
    @DisplayName("DST fall-back (America/New_York, 2026-11-01): daily series produces one entry")
    void dstFallBackAmericaNewYorkDailySeriesProducesOneEntry() {
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2026, 10, 30), // Friday before fall-back
              "America/New_York");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2026, 11, 3));

      // Must include 2026-11-01 exactly once (no duplicate from the extra hour)
      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 10, 30),
              LocalDate.of(2026, 10, 31),
              LocalDate.of(2026, 11, 1), // fall-back — exactly one occurrence
              LocalDate.of(2026, 11, 2),
              LocalDate.of(2026, 11, 3));
      assertThat(dates).doesNotHaveDuplicates();
    }

    /**
     * DST-free half-hour offset zone: Asia/Kolkata (UTC+05:30).
     *
     * <p>Kolkata never observes DST. A daily series resolved in Asia/Kolkata must advance by one
     * calendar day at each step regardless of UTC offsets. This validates that the half-hour
     * increment (+05:30) does not cause any skipped or doubled dates in the engine.
     */
    @Test
    @DisplayName("DST-free half-hour zone (Asia/Kolkata): daily series produces correct sequence")
    void dstFreeHalfHourZoneKolkataDailySeriesCorrect() {
      // Series resolved in Asia/Kolkata; engine works with LocalDate — no UTC arithmetic needed
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2026, 3, 28), // Start 3 days before UK spring-forward (irrelevant here)
              "Asia/Kolkata");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2026, 4, 1));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 3, 28),
              LocalDate.of(2026, 3, 29),
              LocalDate.of(2026, 3, 30),
              LocalDate.of(2026, 3, 31),
              LocalDate.of(2026, 4, 1));
    }

    /**
     * UTC baseline: a daily series in UTC must produce consecutive calendar days. Serves as the
     * reference for all other timezone comparisons.
     */
    @Test
    @DisplayName("UTC baseline: daily series produces consecutive calendar days")
    void utcBaselineDailySeriesConsecutiveDays() {
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2026, 6, 1),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2026, 6, 5));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 6, 1),
              LocalDate.of(2026, 6, 2),
              LocalDate.of(2026, 6, 3),
              LocalDate.of(2026, 6, 4),
              LocalDate.of(2026, 6, 5));
    }

    /**
     * Europe/London DST spring-forward 2026: clocks move forward on 2026-03-29 (last Sunday in
     * March). Daily series must include 2026-03-29 exactly once.
     */
    @Test
    @DisplayName("DST spring-forward (Europe/London, 2026-03-29): daily series includes gap date")
    void dstSpringForwardEuropeLondonIncludesGapDate() {
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2026, 3, 27),
              "Europe/London");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2026, 3, 31));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 3, 27),
              LocalDate.of(2026, 3, 28),
              LocalDate.of(2026, 3, 29), // spring-forward — must NOT be skipped
              LocalDate.of(2026, 3, 30),
              LocalDate.of(2026, 3, 31));
    }
  }

  // ===========================================================================
  // Section 2 — Midnight and year boundary correctness
  // ===========================================================================

  @Nested
  @DisplayName("Section 2 — Midnight and year boundary correctness")
  class Section2MidnightAndYearBoundary {

    /**
     * Daily series starting 2026-12-31 crosses the year boundary into 2027. The occurrence engine
     * must correctly cross the Dec 31 → Jan 1 boundary without skipping or repeating.
     */
    @Test
    @DisplayName("daily series crosses Dec 31 → Jan 1 year boundary correctly")
    void dailySeriesCrossesYearBoundary() {
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2026, 12, 30),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2027, 1, 2));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 12, 30),
              LocalDate.of(2026, 12, 31),
              LocalDate.of(2027, 1, 1), // year boundary
              LocalDate.of(2027, 1, 2));
    }

    /**
     * WEEKLY MONDAY series from 2026-12-28 to 2027-01-12 must produce Mondays: Dec 28, Jan 4, Jan
     * 11. This validates ISO week arithmetic across the year boundary.
     */
    @Test
    @DisplayName(
        "weekly MONDAY series crosses ISO week/year boundary (Dec 28, 2026 → Jan 11, 2027)")
    void weeklyMondaySeriesCrossesIsoWeekYearBoundary() {
      // 2026-12-28 is a Monday
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.WEEKLY,
              1,
              "MONDAY",
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2026, 12, 28),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2027, 1, 14));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 12, 28), // Monday in ISO-week 53 of 2026
              LocalDate.of(2027, 1, 4), // Monday in ISO-week 1 of 2027
              LocalDate.of(2027, 1, 11)); // Monday in ISO-week 2 of 2027
    }

    /**
     * WEEKLY MONDAY,FRIDAY series from Dec 28, 2026. The first Monday = Dec 28, first Friday = Jan
     * 1 (crossing the year boundary in the same week iteration).
     */
    @Test
    @DisplayName("weekly MONDAY+FRIDAY series: first Friday falls in next year (Jan 1, 2027)")
    void weeklyMondayFridayCrossesYearWithinSameWeek() {
      // 2026-12-28 is Monday; 2027-01-01 is the Friday of that same ISO week
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.WEEKLY,
              1,
              "MONDAY,FRIDAY",
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2026, 12, 28),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2027, 1, 8));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 12, 28), // Monday
              LocalDate.of(2027, 1, 1), // Friday — crosses year boundary in same week
              LocalDate.of(2027, 1, 4), // Monday of next week
              LocalDate.of(2027, 1, 8)); // Friday of next week
    }
  }

  // ===========================================================================
  // Section 3 — Month-end and leap-year clamping
  // ===========================================================================

  @Nested
  @DisplayName("Section 3 — Month-end and leap-year clamping")
  class Section3MonthEndAndLeapYear {

    /**
     * Monthly series anchored to day 31 starting Jan 31, 2024 (a leap year). Expected behaviour:
     *
     * <ul>
     *   <li>Jan 31 → Jan 31
     *   <li>Feb 31 → Feb 29 (leap year — clamp to last day of Feb)
     *   <li>Mar 31 → Mar 31
     *   <li>Apr 31 → Apr 30 (April has 30 days — clamp)
     * </ul>
     */
    @Test
    @DisplayName("monthly day-31 series: Feb 2024 leap-year clamps to Feb 29, Apr clamps to Apr 30")
    void monthlyDay31LeapYearClamping() {
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.MONTHLY,
              1,
              null,
              31,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2024, 1, 31),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2024, 4, 30));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2024, 1, 31),
              LocalDate.of(2024, 2, 29), // leap year — clamped from day 31 to 29
              LocalDate.of(2024, 3, 31),
              LocalDate.of(2024, 4, 30)); // April has 30 days — clamped from 31 to 30
    }

    /**
     * Monthly series anchored to day 29 in a non-leap year (2025). Feb 2025 has 28 days; the
     * occurrence must clamp to Feb 28.
     */
    @Test
    @DisplayName("monthly day-29 series: Feb 2025 (non-leap) clamps to Feb 28")
    void monthlyDay29NonLeapYearClampsToFeb28() {
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.MONTHLY,
              1,
              null,
              29,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2025, 1, 29),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2025, 3, 29));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2025, 1, 29),
              LocalDate.of(2025, 2, 28), // non-leap year — clamped from 29 to 28
              LocalDate.of(2025, 3, 29));
    }

    /**
     * Monthly series anchored to day 31 with UNTIL_DATE end mode ending exactly on Mar 31. Ensures
     * the UNTIL_DATE boundary includes the last occurrence and does not overshoot.
     */
    @Test
    @DisplayName("monthly day-31 UNTIL_DATE: last occurrence on Mar 31 is included")
    void monthlyDay31UntilDateIncludesLastOccurrence() {
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.MONTHLY,
              1,
              null,
              31,
              RecurrenceEndMode.UNTIL_DATE,
              LocalDate.of(2026, 3, 31), // end on Mar 31 exactly
              null,
              LocalDate.of(2026, 1, 31),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2026, 5, 31));

      // Feb 28 clamped (2026 is non-leap); Mar 31 included as last occurrence
      assertThat(dates)
          .containsExactly(
              LocalDate.of(2026, 1, 31),
              LocalDate.of(2026, 2, 28), // non-leap — clamped
              LocalDate.of(2026, 3, 31)); // exactly at end date — included
    }

    /**
     * Leap-year Feb 29 occurrence: monthly series anchored to day 29 starting Feb 29, 2024. In
     * non-leap months the occurrence clamps to the last day of that month.
     */
    @Test
    @DisplayName("monthly day-29 starting Feb 29 2024 (leap): subsequent Febs clamp correctly")
    void monthlyDay29StartingLeapFebThenNonLeap() {
      // Start Feb 29, 2024; next Feb in the horizon range is Feb 2025 (non-leap → 28)
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.MONTHLY,
              1,
              null,
              29,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2024, 2, 29),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2025, 2, 28));

      assertThat(dates)
          .contains(LocalDate.of(2024, 2, 29)) // leap year start
          .contains(LocalDate.of(2025, 2, 28)); // non-leap Feb — clamped from 29 to 28

      // No Feb occurrence in 2025 should have day > 28 (Feb 29, 2025 does not exist as a valid
      // date)
      boolean hasInvalidFeb2025Day =
          dates.stream()
              .anyMatch(
                  d -> d.getYear() == 2025 && d.getMonthValue() == 2 && d.getDayOfMonth() > 28);
      assertThat(hasInvalidFeb2025Day)
          .as("No date in Feb 2025 should exceed day 28 (non-leap year)")
          .isFalse();
    }
  }

  // ===========================================================================
  // Section 4 — Week/year ISO boundary recurrence
  // ===========================================================================

  @Nested
  @DisplayName("Section 4 — Week/year ISO boundary recurrence")
  class Section4WeekYearBoundary {

    /**
     * ISO week boundary test: Dec 29, 2025 is a Monday (ISO week 1 of 2026 starts Jan 5, 2026 per
     * ISO 8601). A weekly MONDAY series from Dec 29, 2025 must produce Dec 29, Jan 5, Jan 12.
     */
    @Test
    @DisplayName("weekly MONDAY series from Dec 29 2025 to Jan 12 2026 spans ISO week/year join")
    void weeklyMondayFromDec292025() {
      // 2025-12-29 is a Monday
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.WEEKLY,
              1,
              "MONDAY",
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2025, 12, 29),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2026, 1, 12));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2025, 12, 29), LocalDate.of(2026, 1, 5), LocalDate.of(2026, 1, 12));
    }

    /**
     * Bi-weekly (interval=2) WEDNESDAY series from Dec 24, 2025. The series must advance by 2 weeks
     * at each step, correctly landing on Jan 7 (skipping Dec 31).
     */
    @Test
    @DisplayName("bi-weekly WEDNESDAY series from Dec 24 2025 skips one week across year boundary")
    void biWeeklyWednesdayCrossesYearBoundary() {
      // 2025-12-24 is a Wednesday
      RecurringTaskSeries s =
          series(
              RecurrenceFrequency.WEEKLY,
              2, // bi-weekly
              "WEDNESDAY",
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              LocalDate.of(2025, 12, 24),
              "UTC");

      List<LocalDate> dates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(s, LocalDate.of(2026, 1, 21));

      assertThat(dates)
          .containsExactly(
              LocalDate.of(2025, 12, 24),
              LocalDate.of(2026, 1, 7), // skips Dec 31 week
              LocalDate.of(2026, 1, 21));
    }

    /**
     * YEARLY frequency is NOT yet implemented by the engine. This test documents the gap as a known
     * limitation and is marked {@code @Disabled} with a TODO for a future ticket.
     *
     * <p>When YEARLY is implemented, remove {@code @Disabled}, add the correct assertion, and
     * reference the implementing ticket.
     */
    @Test
    @Disabled(
        "TODO: YEARLY frequency not yet implemented in RecurrenceOccurrenceEngine"
            + " (LOS-1505 known limitation)")
    @DisplayName(
        "yearly series crosses leap-year boundary — DISABLED pending YEARLY implementation")
    void yearlySeriesCrossesLeapYearBoundaryDisabled() {
      // Placeholder: a yearly series starting 2024-02-29 would produce 2024-02-29, 2025-02-28
      // (clamped), 2026-02-28, 2028-02-29 (next leap year)
      // Assertion intentionally left empty — test disabled until feature is implemented
    }
  }

  // ===========================================================================
  // Section 5 — Timezone change on recurring series
  // ===========================================================================

  @Nested
  @DisplayName("Section 5 — Timezone change on recurring series")
  class Section5TimezoneChangeOnSeries {

    /**
     * When a series' {@code timeZone} field is updated, existing occurrence dates that were
     * originally resolved in the old timezone are not affected — the engine generates {@link
     * LocalDate} values independent of the stored zone string. Two series with identical start
     * dates but different timezone annotations produce identical occurrence sequences, confirming
     * that timezone is advisory (used only at the API input/display boundary) and does not alter
     * the date arithmetic.
     */
    @Test
    @DisplayName("timezone annotation change does not alter LocalDate occurrence sequence")
    void timezoneChangeDoesNotAlterOccurrenceDates() {
      LocalDate startDate = LocalDate.of(2026, 3, 7); // One day before NY spring-forward
      LocalDate horizon = LocalDate.of(2026, 3, 10);

      // Series stored with America/New_York timezone annotation
      RecurringTaskSeries nyZoneSeries =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              startDate,
              "America/New_York");

      // Same series if timezone annotation were changed to UTC
      RecurringTaskSeries utcZoneSeries =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              startDate,
              "UTC");

      List<LocalDate> nyDates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(nyZoneSeries, horizon);
      List<LocalDate> utcDates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(utcZoneSeries, horizon);

      // Both produce the same LocalDate sequence — timezone annotation is advisory
      assertThat(nyDates).isEqualTo(utcDates);
      assertThat(nyDates)
          .containsExactly(
              LocalDate.of(2026, 3, 7),
              LocalDate.of(2026, 3, 8),
              LocalDate.of(2026, 3, 9),
              LocalDate.of(2026, 3, 10));
    }

    /**
     * Half-hour vs integer-offset timezone annotation: Asia/Kolkata (+05:30) vs Asia/Tashkent
     * (+05:00). Same start date, same horizon — occurrence sequences are identical because the
     * engine uses LocalDate arithmetic, not UTC conversion.
     */
    @Test
    @DisplayName("half-hour offset vs integer-offset timezone: same LocalDate sequence")
    void halfHourOffsetVsIntegerOffsetProduceSameDates() {
      LocalDate startDate = LocalDate.of(2026, 5, 1);
      LocalDate horizon = LocalDate.of(2026, 5, 5);

      RecurringTaskSeries kolkataSeries =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              startDate,
              "Asia/Kolkata");

      RecurringTaskSeries tashkentSeries =
          series(
              RecurrenceFrequency.DAILY,
              1,
              null,
              null,
              RecurrenceEndMode.NEVER,
              null,
              null,
              startDate,
              "Asia/Tashkent");

      List<LocalDate> kolkataDates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(kolkataSeries, horizon);
      List<LocalDate> tashkentDates =
          RecurrenceOccurrenceEngine.generateOccurrenceDates(tashkentSeries, horizon);

      assertThat(kolkataDates).isEqualTo(tashkentDates);
      assertThat(kolkataDates).hasSize(5);
    }
  }

  // ===========================================================================
  // Section 6 — Habit streak correctness across DST spring-forward boundary
  // ===========================================================================

  @Nested
  @DisplayName("Section 6 — Habit streak correctness across DST boundary")
  class Section6HabitStreakDstBoundary {

    /**
     * DST spring-forward does not create a "missing day" in a habit streak.
     *
     * <p>America/New_York spring-forward 2026: clocks advance on 2026-03-08. A user who completes
     * their habit on every day including 2026-03-08 must see an unbroken streak. The local date
     * 2026-03-08 is a valid calendar day; it is not skipped even though midnight is inside the DST
     * gap.
     */
    @Test
    @DisplayName(
        "daily habit streak is unbroken across America/New_York spring-forward (Mar 8 2026)")
    void dailyHabitStreakUnbrokenAcrossNySpringForward() {
      Habit habit = dailyHabit("America/New_York");
      LocalDate from = LocalDate.of(2026, 3, 5);
      LocalDate to = LocalDate.of(2026, 3, 12);

      // Entry for every day including 2026-03-08 (spring-forward)
      List<HabitEntry> entries =
          List.of(
              habitEntry(LocalDate.of(2026, 3, 5), 1),
              habitEntry(LocalDate.of(2026, 3, 6), 1),
              habitEntry(LocalDate.of(2026, 3, 7), 1),
              habitEntry(LocalDate.of(2026, 3, 8), 1), // spring-forward day — must NOT be gap
              habitEntry(LocalDate.of(2026, 3, 9), 1),
              habitEntry(LocalDate.of(2026, 3, 10), 1),
              habitEntry(LocalDate.of(2026, 3, 11), 1),
              habitEntry(LocalDate.of(2026, 3, 12), 1));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.currentStreak())
          .as("Streak must be unbroken across the DST spring-forward date")
          .isEqualTo(8);
      assertThat(result.eligiblePeriods()).isEqualTo(8);
      assertThat(result.metTargetPeriods()).isEqualTo(8);
      assertThat(result.completionRate()).isEqualTo(1.0);
    }

    /**
     * DST fall-back does not produce a duplicate calendar day or inflate the streak counter.
     *
     * <p>America/New_York fall-back 2026: clocks fall back on 2026-11-01. The 25-hour wall-clock
     * day must still count as a single eligible period (one entry = one met period).
     */
    @Test
    @DisplayName("daily habit streak is not inflated by fall-back extra hour (Nov 1 2026)")
    void dailyHabitStreakNotInflatedByFallBack() {
      Habit habit = dailyHabit("America/New_York");
      LocalDate from = LocalDate.of(2026, 10, 30);
      LocalDate to = LocalDate.of(2026, 11, 3);

      List<HabitEntry> entries =
          List.of(
              habitEntry(LocalDate.of(2026, 10, 30), 1),
              habitEntry(LocalDate.of(2026, 10, 31), 1),
              habitEntry(LocalDate.of(2026, 11, 1), 1), // fall-back day — 25h long, still 1 entry
              habitEntry(LocalDate.of(2026, 11, 2), 1),
              habitEntry(LocalDate.of(2026, 11, 3), 1));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.eligiblePeriods())
          .as("Fall-back day must not be counted twice")
          .isEqualTo(5);
      assertThat(result.metTargetPeriods()).isEqualTo(5);
      assertThat(result.currentStreak()).isEqualTo(5);
    }

    /**
     * Asia/Kolkata (UTC+05:30, no DST): habit streak is stable across any month boundary in a
     * DST-free half-hour zone. Validates that half-hour arithmetic does not produce off-by-one
     * dates in streak bucketing.
     */
    @Test
    @DisplayName("daily habit streak stable in Asia/Kolkata across month boundary")
    void dailyHabitStreakStableInKolkataAcrossMonthBoundary() {
      Habit habit = dailyHabit("Asia/Kolkata");
      LocalDate from = LocalDate.of(2026, 3, 29);
      LocalDate to = LocalDate.of(2026, 4, 2);

      List<HabitEntry> entries =
          List.of(
              habitEntry(LocalDate.of(2026, 3, 29), 1),
              habitEntry(LocalDate.of(2026, 3, 30), 1),
              habitEntry(LocalDate.of(2026, 3, 31), 1),
              habitEntry(LocalDate.of(2026, 4, 1), 1), // month boundary
              habitEntry(LocalDate.of(2026, 4, 2), 1));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.currentStreak()).isEqualTo(5);
      assertThat(result.eligiblePeriods()).isEqualTo(5);
      assertThat(result.completionRate()).isEqualTo(1.0);
    }

    /**
     * Pause across DST boundary: a pause that spans the spring-forward date in America/New_York is
     * handled correctly. The paused day (Mar 8) is excluded from the eligible count; the streak
     * continues unbroken around it.
     */
    @Test
    @DisplayName("pause spanning DST spring-forward day excludes that day without breaking streak")
    void pauseSpanningDstSpringForwardExcludesDayWithoutBreakingStreak() {
      Habit habit = dailyHabit("America/New_York");
      LocalDate from = LocalDate.of(2026, 3, 6);
      LocalDate to = LocalDate.of(2026, 3, 10);

      // Pause exactly on the spring-forward date
      List<HabitPausePeriod> pauses =
          List.of(pause(LocalDate.of(2026, 3, 8), LocalDate.of(2026, 3, 8)));

      List<HabitEntry> entries =
          List.of(
              habitEntry(LocalDate.of(2026, 3, 6), 1),
              habitEntry(LocalDate.of(2026, 3, 7), 1),
              // 2026-03-08 paused — no entry needed
              habitEntry(LocalDate.of(2026, 3, 9), 1),
              habitEntry(LocalDate.of(2026, 3, 10), 1));

      HabitStreakResult result = HabitStreakCalculator.calculate(habit, entries, pauses, from, to);

      // 4 eligible days (5 total − 1 paused); all 4 met
      assertThat(result.eligiblePeriods()).isEqualTo(4);
      assertThat(result.metTargetPeriods()).isEqualTo(4);
      assertThat(result.currentStreak())
          .as("Pause across DST must not break the streak")
          .isEqualTo(4);
    }
  }
}
