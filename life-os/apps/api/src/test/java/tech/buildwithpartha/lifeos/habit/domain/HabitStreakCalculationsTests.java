package tech.buildwithpartha.lifeos.habit.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Deterministic boundary-fixture tests for {@link HabitStreakCalculator} as defined by LOS-1210.
 *
 * <p>All fixtures use stable LifeOS-identity dates and user IDs with no reference-product data. No
 * mocks, no Spring context — pure domain arithmetic.
 */
@DisplayName("Habit streak calculation rules (LOS-1210)")
class HabitStreakCalculationsTests {

  // ---------------------------------------------------------------------------
  // Fixture helpers
  // ---------------------------------------------------------------------------

  private static final UUID USER_ID = HabitDomainFixture.USER_ID;
  private static final UUID HABIT_ID = HabitDomainFixture.HABIT_ID;
  private static final Instant T0 = Instant.parse("2026-01-01T00:00:00Z");

  private static Habit dailyHabit(int targetCount) {
    return new Habit(
        HABIT_ID,
        USER_ID,
        "Daily habit",
        Optional.empty(),
        HabitCadence.DAILY,
        targetCount,
        "UTC",
        Optional.empty(),
        false,
        Optional.empty(),
        false,
        T0,
        T0,
        0L);
  }

  private static Habit weeklyHabit(int targetCount) {
    return new Habit(
        HABIT_ID,
        USER_ID,
        "Weekly habit",
        Optional.empty(),
        HabitCadence.WEEKLY,
        targetCount,
        "UTC",
        Optional.empty(),
        false,
        Optional.empty(),
        false,
        T0,
        T0,
        0L);
  }

  private static Habit monthlyHabit(int targetCount) {
    return new Habit(
        HABIT_ID,
        USER_ID,
        "Monthly habit",
        Optional.empty(),
        HabitCadence.MONTHLY,
        targetCount,
        "UTC",
        Optional.empty(),
        false,
        Optional.empty(),
        false,
        T0,
        T0,
        0L);
  }

  private static HabitEntry entry(LocalDate date, int count) {
    return new HabitEntry(UUID.randomUUID(), HABIT_ID, USER_ID, date, count, T0, T0, 0L);
  }

  private static HabitPausePeriod pause(LocalDate start, LocalDate end) {
    return new HabitPausePeriod(
        UUID.randomUUID(), HABIT_ID, USER_ID, start, Optional.of(end), Optional.empty(), T0);
  }

  private static HabitPausePeriod openPause(LocalDate start) {
    return new HabitPausePeriod(
        UUID.randomUUID(), HABIT_ID, USER_ID, start, Optional.empty(), Optional.empty(), T0);
  }

  // ---------------------------------------------------------------------------
  // Daily cadence
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("DAILY cadence")
  class DailyCadenceTests {

    /**
     * All 7 days in window have entries meeting target=1. Expected: streak=7, longest=7,
     * eligible=7, met=7, rate=1.0
     */
    @Test
    @DisplayName("all days met → streak = window size")
    void allDaysMet() {
      Habit habit = dailyHabit(1);
      LocalDate from = LocalDate.of(2026, 2, 1);
      LocalDate to = LocalDate.of(2026, 2, 7);
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 1), 1),
              entry(LocalDate.of(2026, 2, 2), 1),
              entry(LocalDate.of(2026, 2, 3), 1),
              entry(LocalDate.of(2026, 2, 4), 1),
              entry(LocalDate.of(2026, 2, 5), 1),
              entry(LocalDate.of(2026, 2, 6), 1),
              entry(LocalDate.of(2026, 2, 7), 1));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.currentStreak()).isEqualTo(7);
      assertThat(result.longestStreak()).isEqualTo(7);
      assertThat(result.eligiblePeriods()).isEqualTo(7);
      assertThat(result.metTargetPeriods()).isEqualTo(7);
      assertThat(result.completionRate()).isEqualTo(1.0);
    }

    /**
     * Day 7 (last) has no entry — most-recent day missed. currentStreak must be 0; longestStreak=6.
     */
    @Test
    @DisplayName("most recent day missed → currentStreak = 0")
    void mostRecentDayMissed() {
      Habit habit = dailyHabit(1);
      LocalDate from = LocalDate.of(2026, 2, 1);
      LocalDate to = LocalDate.of(2026, 2, 7);
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 1), 1),
              entry(LocalDate.of(2026, 2, 2), 1),
              entry(LocalDate.of(2026, 2, 3), 1),
              entry(LocalDate.of(2026, 2, 4), 1),
              entry(LocalDate.of(2026, 2, 5), 1),
              entry(LocalDate.of(2026, 2, 6), 1)
              // 2026-02-07 is missing
              );

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.currentStreak()).isEqualTo(0);
      assertThat(result.longestStreak()).isEqualTo(6);
      assertThat(result.eligiblePeriods()).isEqualTo(7);
      assertThat(result.metTargetPeriods()).isEqualTo(6);
    }

    /**
     * Day 3 is fully paused — invisible to streak counter. 6 eligible days, all met → streak=6
     * (pause doesn't break it).
     */
    @Test
    @DisplayName("single paused day skipped; streak is unbroken across the pause")
    void singlePausedDayDoesNotBreakStreak() {
      Habit habit = dailyHabit(1);
      LocalDate from = LocalDate.of(2026, 2, 1);
      LocalDate to = LocalDate.of(2026, 2, 7);
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 1), 1),
              entry(LocalDate.of(2026, 2, 2), 1),
              // 2026-02-03 paused — no entry needed
              entry(LocalDate.of(2026, 2, 4), 1),
              entry(LocalDate.of(2026, 2, 5), 1),
              entry(LocalDate.of(2026, 2, 6), 1),
              entry(LocalDate.of(2026, 2, 7), 1));
      List<HabitPausePeriod> pauses =
          List.of(pause(LocalDate.of(2026, 2, 3), LocalDate.of(2026, 2, 3)));

      HabitStreakResult result = HabitStreakCalculator.calculate(habit, entries, pauses, from, to);

      assertThat(result.eligiblePeriods()).isEqualTo(6);
      assertThat(result.metTargetPeriods()).isEqualTo(6);
      assertThat(result.currentStreak()).isEqualTo(6);
      assertThat(result.longestStreak()).isEqualTo(6);
      assertThat(result.completionRate()).isEqualTo(1.0);
    }

    /**
     * Day 5 was originally missed, then a late entry is added for that date. Result: streak=7 (all
     * 7 days now met), late edit repairs the gap.
     */
    @Test
    @DisplayName("late edit repairs a past miss → currentStreak includes repaired day")
    void lateEditRepairsStreak() {
      Habit habit = dailyHabit(1);
      LocalDate from = LocalDate.of(2026, 2, 1);
      LocalDate to = LocalDate.of(2026, 2, 7);
      // Day 5 entry is late (recorded after the fact) but stored with its local date
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 1), 1),
              entry(LocalDate.of(2026, 2, 2), 1),
              entry(LocalDate.of(2026, 2, 3), 1),
              entry(LocalDate.of(2026, 2, 4), 1),
              entry(LocalDate.of(2026, 2, 5), 1), // late edit — repairs the gap
              entry(LocalDate.of(2026, 2, 6), 1),
              entry(LocalDate.of(2026, 2, 7), 1));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.currentStreak()).isEqualTo(7);
      assertThat(result.longestStreak()).isEqualTo(7);
    }

    /** Target=8; entry on a day has completedCount=7 — below the target. That day is a miss. */
    @Test
    @DisplayName("entry exists but completedCount < targetCount → miss")
    void entryBelowTargetCountIsMiss() {
      Habit habit = dailyHabit(8); // e.g. 8 glasses of water
      LocalDate day = LocalDate.of(2026, 3, 1);
      List<HabitEntry> entries = List.of(entry(day, 7)); // only 7, need 8

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), day, day);

      assertThat(result.currentStreak()).isEqualTo(0);
      assertThat(result.metTargetPeriods()).isEqualTo(0);
      assertThat(result.eligiblePeriods()).isEqualTo(1);
    }

    /**
     * Target=8; multiple entries on the same date sum to 8 (e.g. increment called twice: 5 + 3).
     * The period is met.
     */
    @Test
    @DisplayName("multiple entries on same date sum to meet target")
    void multipleEntriesSameDateSumToMeetTarget() {
      Habit habit = dailyHabit(8);
      LocalDate day = LocalDate.of(2026, 3, 1);
      // Two entries for the same local date (e.g. two increments on the same day)
      List<HabitEntry> entries = List.of(entry(day, 5), entry(day, 3));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), day, day);

      assertThat(result.currentStreak()).isEqualTo(1);
      assertThat(result.metTargetPeriods()).isEqualTo(1);
    }

    /** Empty window (to before from) → all zeros. */
    @Test
    @DisplayName("empty window (to before from) → all zeros")
    void emptyWindowAllZeros() {
      Habit habit = dailyHabit(1);
      HabitStreakResult result =
          HabitStreakCalculator.calculate(
              habit,
              List.of(),
              List.of(),
              LocalDate.of(2026, 2, 7),
              LocalDate.of(2026, 2, 1) // inverted
              );

      assertThat(result.currentStreak()).isEqualTo(0);
      assertThat(result.longestStreak()).isEqualTo(0);
      assertThat(result.eligiblePeriods()).isEqualTo(0);
      assertThat(result.completionRate()).isEqualTo(0.0);
    }

    /** Entire window is paused → eligiblePeriods=0, rate=0.0. */
    @Test
    @DisplayName("entire window paused → eligiblePeriods=0 and rate=0.0")
    void entireWindowPausedYieldsZeroEligible() {
      Habit habit = dailyHabit(1);
      LocalDate from = LocalDate.of(2026, 3, 1);
      LocalDate to = LocalDate.of(2026, 3, 7);
      List<HabitPausePeriod> pauses = List.of(pause(from, to));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, List.of(), pauses, from, to);

      assertThat(result.eligiblePeriods()).isEqualTo(0);
      assertThat(result.currentStreak()).isEqualTo(0);
      assertThat(result.completionRate()).isEqualTo(0.0);
    }

    /** Open-ended pause covers "today" and beyond → those days are excluded. */
    @Test
    @DisplayName("open-ended pause covers all future dates from its start")
    void openEndedPauseCoversLastDays() {
      Habit habit = dailyHabit(1);
      LocalDate from = LocalDate.of(2026, 3, 1);
      LocalDate to = LocalDate.of(2026, 3, 5);
      // Pause starts on the 4th and has no end date — covers 4th and 5th in the window
      List<HabitPausePeriod> pauses = List.of(openPause(LocalDate.of(2026, 3, 4)));
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 3, 1), 1),
              entry(LocalDate.of(2026, 3, 2), 1),
              entry(LocalDate.of(2026, 3, 3), 1));

      HabitStreakResult result = HabitStreakCalculator.calculate(habit, entries, pauses, from, to);

      // 3 eligible, 2 paused
      assertThat(result.eligiblePeriods()).isEqualTo(3);
      assertThat(result.metTargetPeriods()).isEqualTo(3);
      assertThat(result.currentStreak()).isEqualTo(3); // last eligible day (3rd) met
    }

    /** Single-day window, met → streak=1. */
    @Test
    @DisplayName("single-day window, met → streak=1")
    void singleDayWindowMet() {
      Habit habit = dailyHabit(1);
      LocalDate day = LocalDate.of(2026, 4, 15);
      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, List.of(entry(day, 1)), List.of(), day, day);

      assertThat(result.currentStreak()).isEqualTo(1);
      assertThat(result.longestStreak()).isEqualTo(1);
      assertThat(result.eligiblePeriods()).isEqualTo(1);
      assertThat(result.completionRate()).isEqualTo(1.0);
    }

    /** Single-day window, not met → streak=0. */
    @Test
    @DisplayName("single-day window, not met → streak=0")
    void singleDayWindowNotMet() {
      Habit habit = dailyHabit(1);
      LocalDate day = LocalDate.of(2026, 4, 15);
      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, List.of(), List.of(), day, day);

      assertThat(result.currentStreak()).isEqualTo(0);
      assertThat(result.eligiblePeriods()).isEqualTo(1);
      assertThat(result.metTargetPeriods()).isEqualTo(0);
    }

    /** Entries outside the window are ignored. */
    @Test
    @DisplayName("entries outside window are ignored")
    void entriesOutsideWindowIgnored() {
      Habit habit = dailyHabit(1);
      LocalDate from = LocalDate.of(2026, 3, 1);
      LocalDate to = LocalDate.of(2026, 3, 3);
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 28), 1), // before window
              entry(LocalDate.of(2026, 3, 1), 1),
              entry(LocalDate.of(2026, 3, 4), 1) // after window
              );

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.eligiblePeriods()).isEqualTo(3);
      assertThat(result.metTargetPeriods()).isEqualTo(1); // only 2026-03-01 is in window and met
    }

    /** Partially-paused day (pause does not fully cover the period) stays eligible. */
    @Test
    @DisplayName("partly-paused daily period: pause covers a different day, stays eligible")
    void partialPauseDoesNotExcludePeriod() {
      Habit habit = dailyHabit(1);
      LocalDate from = LocalDate.of(2026, 3, 1);
      LocalDate to = LocalDate.of(2026, 3, 3);
      // Pause only covers the 2nd; the 1st and 3rd are not paused
      List<HabitPausePeriod> pauses =
          List.of(pause(LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 2)));
      List<HabitEntry> entries =
          List.of(entry(LocalDate.of(2026, 3, 1), 1), entry(LocalDate.of(2026, 3, 3), 1));

      HabitStreakResult result = HabitStreakCalculator.calculate(habit, entries, pauses, from, to);

      // 3 eligible (DAILY: each day is its own period; the paused day = fully-paused period → 2
      // eligible)
      // Wait: 2026-03-02 is fully paused (it's a 1-day period covered entirely) → excluded
      assertThat(result.eligiblePeriods()).isEqualTo(2);
      assertThat(result.metTargetPeriods()).isEqualTo(2);
      assertThat(result.currentStreak())
          .isEqualTo(2); // last eligible day (3rd) met; 2nd paused (skipped)
    }
  }

  // ---------------------------------------------------------------------------
  // Weekly cadence
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("WEEKLY cadence")
  class WeeklyCadenceTests {

    /**
     * Window spans two full ISO weeks (2026-02-02 Mon → 2026-02-15 Sun). Target=3 per week. Week 1:
     * 3 entries → met. Week 2: 0 entries → miss.
     */
    @Test
    @DisplayName("first week met, second week missed → currentStreak=0, longestStreak=1")
    void firstWeekMetSecondMissed() {
      Habit habit = weeklyHabit(3);
      LocalDate from = LocalDate.of(2026, 2, 2); // Monday
      LocalDate to = LocalDate.of(2026, 2, 15); // Sunday of week 2
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 2), 1),
              entry(LocalDate.of(2026, 2, 3), 1),
              entry(LocalDate.of(2026, 2, 4), 1)); // 3 in week 1; 0 in week 2

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.eligiblePeriods()).isEqualTo(2);
      assertThat(result.metTargetPeriods()).isEqualTo(1);
      assertThat(result.currentStreak()).isEqualTo(0); // last week missed
      assertThat(result.longestStreak()).isEqualTo(1);
    }

    /** Both weeks met target=3. */
    @Test
    @DisplayName("both weeks met → currentStreak=2")
    void bothWeeksMet() {
      Habit habit = weeklyHabit(3);
      LocalDate from = LocalDate.of(2026, 2, 2);
      LocalDate to = LocalDate.of(2026, 2, 15);
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 2), 1),
              entry(LocalDate.of(2026, 2, 3), 1),
              entry(LocalDate.of(2026, 2, 4), 1),
              entry(LocalDate.of(2026, 2, 9), 1),
              entry(LocalDate.of(2026, 2, 10), 1),
              entry(LocalDate.of(2026, 2, 11), 1));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.eligiblePeriods()).isEqualTo(2);
      assertThat(result.metTargetPeriods()).isEqualTo(2);
      assertThat(result.currentStreak()).isEqualTo(2);
      assertThat(result.longestStreak()).isEqualTo(2);
      assertThat(result.completionRate()).isEqualTo(1.0);
    }

    /** One of two weeks is fully paused. Eligible=1; if that week was met, streak=1. */
    @Test
    @DisplayName("one week fully paused → eligible=1, streak counts only remaining week")
    void oneWeekFullyPaused() {
      Habit habit = weeklyHabit(3);
      // ISO week 2026-02-02 to 2026-02-08 — fully paused
      LocalDate from = LocalDate.of(2026, 2, 2);
      LocalDate to = LocalDate.of(2026, 2, 15);
      List<HabitPausePeriod> pauses =
          List.of(pause(LocalDate.of(2026, 2, 2), LocalDate.of(2026, 2, 8)));
      // Week 2 (2026-02-09 to 2026-02-15) has 3 entries → met
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 9), 1),
              entry(LocalDate.of(2026, 2, 10), 1),
              entry(LocalDate.of(2026, 2, 11), 1));

      HabitStreakResult result = HabitStreakCalculator.calculate(habit, entries, pauses, from, to);

      assertThat(result.eligiblePeriods()).isEqualTo(1);
      assertThat(result.metTargetPeriods()).isEqualTo(1);
      assertThat(result.currentStreak()).isEqualTo(1);
      assertThat(result.completionRate()).isEqualTo(1.0);
    }
  }

  // ---------------------------------------------------------------------------
  // Monthly cadence
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("MONTHLY cadence")
  class MonthlyCadenceTests {

    /** One-month window, target=20, exactly 20 entries → met. */
    @Test
    @DisplayName("monthly target met in single month window → streak=1")
    void monthlyTargetMet() {
      Habit habit = monthlyHabit(20);
      LocalDate from = LocalDate.of(2026, 2, 1);
      LocalDate to = LocalDate.of(2026, 2, 28);
      // 20 entries across the month
      List<HabitEntry> entries =
          List.of(
              entry(LocalDate.of(2026, 2, 1), 1),
              entry(LocalDate.of(2026, 2, 2), 1),
              entry(LocalDate.of(2026, 2, 3), 1),
              entry(LocalDate.of(2026, 2, 4), 1),
              entry(LocalDate.of(2026, 2, 5), 1),
              entry(LocalDate.of(2026, 2, 6), 1),
              entry(LocalDate.of(2026, 2, 7), 1),
              entry(LocalDate.of(2026, 2, 8), 1),
              entry(LocalDate.of(2026, 2, 9), 1),
              entry(LocalDate.of(2026, 2, 10), 1),
              entry(LocalDate.of(2026, 2, 11), 1),
              entry(LocalDate.of(2026, 2, 12), 1),
              entry(LocalDate.of(2026, 2, 13), 1),
              entry(LocalDate.of(2026, 2, 14), 1),
              entry(LocalDate.of(2026, 2, 15), 1),
              entry(LocalDate.of(2026, 2, 16), 1),
              entry(LocalDate.of(2026, 2, 17), 1),
              entry(LocalDate.of(2026, 2, 18), 1),
              entry(LocalDate.of(2026, 2, 19), 1),
              entry(LocalDate.of(2026, 2, 20), 1));

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.eligiblePeriods()).isEqualTo(1);
      assertThat(result.metTargetPeriods()).isEqualTo(1);
      assertThat(result.currentStreak()).isEqualTo(1);
      assertThat(result.longestStreak()).isEqualTo(1);
      assertThat(result.completionRate()).isEqualTo(1.0);
    }

    /** Monthly target=20; only 19 entries → miss. */
    @Test
    @DisplayName("monthly target not reached → miss")
    void monthlyTargetNotReached() {
      Habit habit = monthlyHabit(20);
      LocalDate from = LocalDate.of(2026, 2, 1);
      LocalDate to = LocalDate.of(2026, 2, 28);
      // Only 19 entries
      List<HabitEntry> entries = new java.util.ArrayList<>();
      for (int day = 1; day <= 19; day++) {
        entries.add(entry(LocalDate.of(2026, 2, day), 1));
      }

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.currentStreak()).isEqualTo(0);
      assertThat(result.metTargetPeriods()).isEqualTo(0);
    }

    /** Two-month window: Jan met, Feb not met → currentStreak=0, longestStreak=1. */
    @Test
    @DisplayName("two months: first met, second not → currentStreak=0, longestStreak=1")
    void twoMonthsFirstMetSecondNot() {
      Habit habit = monthlyHabit(1);
      LocalDate from = LocalDate.of(2026, 1, 1);
      LocalDate to = LocalDate.of(2026, 2, 28);
      List<HabitEntry> entries =
          List.of(entry(LocalDate.of(2026, 1, 15), 1)); // Jan met; Feb has nothing

      HabitStreakResult result =
          HabitStreakCalculator.calculate(habit, entries, List.of(), from, to);

      assertThat(result.eligiblePeriods()).isEqualTo(2);
      assertThat(result.metTargetPeriods()).isEqualTo(1);
      assertThat(result.currentStreak()).isEqualTo(0);
      assertThat(result.longestStreak()).isEqualTo(1);
    }
  }

  // ---------------------------------------------------------------------------
  // Timezone boundary
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("Timezone-safe bucketing")
  class TimezoneBoundaryTests {

    /**
     * Completion instant 2026-02-01T03:00:00Z is 2026-01-31 in America/New_York (UTC-5). The entry
     * is stored with local date 2026-01-31. The calculation must count it for the 31st, not the
     * 1st.
     */
    @Test
    @DisplayName("near-midnight completion is bucketed into the habit local date at recording time")
    void nearMidnightCompletionBucketedCorrectly() {
      // Habit in New York timezone, daily target=1
      Habit nyHabit =
          new Habit(
              HABIT_ID,
              USER_ID,
              "NY habit",
              Optional.empty(),
              HabitCadence.DAILY,
              1,
              "America/New_York",
              Optional.empty(),
              false,
              Optional.empty(),
              false,
              T0,
              T0,
              0L);

      // The instant 2026-02-01T03:00:00Z maps to 2026-01-31 in New York
      Instant completionInstant = Instant.parse("2026-02-01T03:00:00Z");
      LocalDate recordedDate = nyHabit.localDateFor(completionInstant);
      assertThat(recordedDate).isEqualTo(LocalDate.of(2026, 1, 31));

      // Entry is stored with the resolved local date
      HabitEntry entry = entry(recordedDate, 1);
      LocalDate from = LocalDate.of(2026, 1, 31);
      LocalDate to = LocalDate.of(2026, 1, 31);

      HabitStreakResult result =
          HabitStreakCalculator.calculate(nyHabit, List.of(entry), List.of(), from, to);

      assertThat(result.metTargetPeriods()).isEqualTo(1);
      assertThat(result.currentStreak()).isEqualTo(1);
    }

    /**
     * Timezone change: entries are stored with the local date resolved at recording time. If the
     * timezone is later changed, stored local dates are NOT re-bucketed. Simulate: entry stored
     * under timezone A → evaluate with habit now using timezone B. The stored local date remains
     * what it was when recorded.
     */
    @Test
    @DisplayName("timezone change does not retroactively re-bucket stored local dates")
    void timezoneChangeDoesNotRebucketStoredEntries() {
      // Original recording: habit was UTC, instant → 2026-02-01
      Instant completionInstant = Instant.parse("2026-02-01T23:00:00Z");
      Habit utcHabit =
          new Habit(
              HABIT_ID,
              USER_ID,
              "UTC habit",
              Optional.empty(),
              HabitCadence.DAILY,
              1,
              "UTC",
              Optional.empty(),
              false,
              Optional.empty(),
              false,
              T0,
              T0,
              0L);
      LocalDate recordedDate = utcHabit.localDateFor(completionInstant);
      assertThat(recordedDate).isEqualTo(LocalDate.of(2026, 2, 1));

      // The habit's timezone is later changed to Asia/Kolkata (UTC+5:30).
      // In Kolkata, 2026-02-01T23:00:00Z is 2026-02-02T04:30. But the stored local date is still
      // 2026-02-01. The calculation uses the stored local date, not the new zone.
      Habit kolkataHabit =
          new Habit(
              HABIT_ID,
              USER_ID,
              "Kolkata habit",
              Optional.empty(),
              HabitCadence.DAILY,
              1,
              "Asia/Kolkata",
              Optional.empty(),
              false,
              Optional.empty(),
              false,
              T0,
              T0,
              0L);

      // Entry stored with the UTC-resolved date; evaluated under the updated Kolkata habit
      HabitEntry storedEntry = entry(recordedDate, 1); // localDate = 2026-02-01
      LocalDate from = LocalDate.of(2026, 2, 1);
      LocalDate to = LocalDate.of(2026, 2, 2);

      HabitStreakResult result =
          HabitStreakCalculator.calculate(kolkataHabit, List.of(storedEntry), List.of(), from, to);

      // 2026-02-01 is credited (the stored date); 2026-02-02 has no entry
      assertThat(result.eligiblePeriods()).isEqualTo(2);
      assertThat(result.metTargetPeriods()).isEqualTo(1); // only 2026-02-01 is credited
      assertThat(result.currentStreak()).isEqualTo(0); // last day (2026-02-02) is a miss
    }
  }

  // ---------------------------------------------------------------------------
  // HabitStreakResult invariants
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("HabitStreakResult record invariants")
  class HabitStreakResultInvariantTests {

    @Test
    @DisplayName("valid result is constructed without exception")
    void validResultConstructed() {
      HabitStreakResult result = new HabitStreakResult(3, 5, 7, 5, 5.0 / 7.0);
      assertThat(result.currentStreak()).isEqualTo(3);
      assertThat(result.longestStreak()).isEqualTo(5);
      assertThat(result.eligiblePeriods()).isEqualTo(7);
      assertThat(result.metTargetPeriods()).isEqualTo(5);
      assertThat(result.completionRate()).isCloseTo(5.0 / 7.0, within(1e-9));
    }

    @Test
    @DisplayName("zero result is valid")
    void zeroResultIsValid() {
      HabitStreakResult result = new HabitStreakResult(0, 0, 0, 0, 0.0);
      assertThat(result.currentStreak()).isEqualTo(0);
      assertThat(result.completionRate()).isEqualTo(0.0);
    }
  }
}
