package tech.buildwithpartha.lifeos.habit.domain;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

/**
 * Pure stateless domain service that evaluates habit streak and cadence metrics for a date window,
 * as specified by LOS-1210.
 *
 * <h2>Cadence → period mapping</h2>
 *
 * <ul>
 *   <li>{@link HabitCadence#DAILY} — each local date in {@code [from, to]} is one period (1 day).
 *   <li>{@link HabitCadence#WEEKLY} — each ISO week (Mon–Sun) that overlaps {@code [from, to]} is
 *       one period. The target is the number of qualifying completions required within that week.
 *   <li>{@link HabitCadence#MONTHLY} — each calendar month that overlaps {@code [from, to]} is one
 *       period. The target is the number of qualifying completions required within that month.
 * </ul>
 *
 * <h2>Pause exclusion</h2>
 *
 * A period is <em>paused</em> (and therefore excluded from all streak and eligibility counts) when
 * <strong>every</strong> calendar day in that period is covered by at least one {@link
 * HabitPausePeriod}. Partly-paused periods (some days covered, some not) remain eligible, and only
 * the <em>entries actually recorded</em> count toward the target — the partially-paused days are
 * not automatically credited.
 *
 * <h2>Streak semantics</h2>
 *
 * <ul>
 *   <li><em>Met target</em>: the sum of {@link HabitEntry#completedCount()} for all entries whose
 *       {@link HabitEntry#localDate()} falls within the period is {@code >= habit.targetCount()}.
 *   <li><em>Streak</em>: a consecutive run of eligible periods that each met the target. Paused
 *       periods are invisible to the streak counter — they neither extend nor break a streak.
 *   <li><em>currentStreak</em>: the run ending at the last eligible period in the window, scanning
 *       backwards; resets to 0 on the first miss.
 *   <li><em>longestStreak</em>: the longest contiguous run of eligible met-target periods anywhere
 *       in the window.
 * </ul>
 *
 * <h2>Late edits</h2>
 *
 * An entry backdated to a past local date is stored with that date and counts for the period that
 * contains it. A late edit that brings a past period's total to {@code >= targetCount} repairs the
 * streak retroactively.
 *
 * <h2>Timezone changes</h2>
 *
 * Entries store the {@link HabitEntry#localDate()} resolved at the moment of recording using the
 * habit's then-current IANA timezone. Changing the habit's timezone later does <em>not</em>
 * retroactively re-bucket stored local dates; only new completions use the updated timezone.
 *
 * <h2>Rounding</h2>
 *
 * {@code completionRate = (double) metTargetPeriods / eligiblePeriods} using Java double
 * arithmetic; exactly {@code 0.0} when {@code eligiblePeriods == 0}. Callers that need a
 * fixed-decimal representation should round at the presentation boundary.
 */
public final class HabitStreakCalculator {

  private HabitStreakCalculator() {}

  /**
   * Calculates streak metrics for {@code habit} over the inclusive local-date window {@code [from,
   * to]}.
   *
   * @param habit the habit whose cadence, targetCount, and timezone define the period grid
   * @param entries all HabitEntries for this habit; need not be pre-filtered to the window — this
   *     method ignores entries outside {@code [from, to]}
   * @param pausePeriods all HabitPausePeriods for this habit
   * @param from first local date of the window (inclusive)
   * @param to last local date of the window (inclusive); if {@code to.isBefore(from)} the result
   *     has all-zero counts
   * @return the computed {@link HabitStreakResult}
   */
  public static HabitStreakResult calculate(
      Habit habit,
      List<HabitEntry> entries,
      List<HabitPausePeriod> pausePeriods,
      LocalDate from,
      LocalDate to) {
    Objects.requireNonNull(habit, "habit must not be null");
    Objects.requireNonNull(entries, "entries must not be null");
    Objects.requireNonNull(pausePeriods, "pausePeriods must not be null");
    Objects.requireNonNull(from, "from must not be null");
    Objects.requireNonNull(to, "to must not be null");

    if (to.isBefore(from)) {
      return new HabitStreakResult(0, 0, 0, 0, 0.0);
    }

    // Build per-period entry totals: periodKey → sum of completedCount
    List<Period> periods = buildPeriods(habit, from, to);

    // Index entries by local date for quick lookup
    Map<LocalDate, Integer> countByDate = new TreeMap<>();
    for (HabitEntry entry : entries) {
      LocalDate d = entry.localDate();
      if (!d.isBefore(from) && !d.isAfter(to)) {
        countByDate.merge(d, entry.completedCount(), Integer::sum);
      }
    }

    // Evaluate each period
    int eligiblePeriods = 0;
    int metTargetPeriods = 0;
    int currentStreak = 0;
    int longestStreak = 0;
    int runningStreak = 0;

    for (Period period : periods) {
      if (isFullyPaused(period, pausePeriods)) {
        // Paused periods are invisible: don't touch runningStreak
        continue;
      }
      eligiblePeriods++;
      int total = sumCount(period, countByDate);
      boolean met = total >= habit.targetCount();
      if (met) {
        metTargetPeriods++;
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }

    // currentStreak: scan backward through periods, skipping fully paused ones
    int streak = 0;
    for (int i = periods.size() - 1; i >= 0; i--) {
      Period period = periods.get(i);
      if (isFullyPaused(period, pausePeriods)) {
        continue; // skip paused; do not break
      }
      int total = sumCount(period, countByDate);
      if (total >= habit.targetCount()) {
        streak++;
      } else {
        break; // first miss stops the current streak
      }
    }
    currentStreak = streak;

    double completionRate =
        eligiblePeriods == 0 ? 0.0 : (double) metTargetPeriods / eligiblePeriods;
    return new HabitStreakResult(
        currentStreak, longestStreak, eligiblePeriods, metTargetPeriods, completionRate);
  }

  // -------------------------------------------------------------------------
  // Period building
  // -------------------------------------------------------------------------

  private static List<Period> buildPeriods(Habit habit, LocalDate from, LocalDate to) {
    return switch (habit.cadence()) {
      case DAILY -> buildDailyPeriods(from, to);
      case WEEKLY -> buildWeeklyPeriods(from, to);
      case MONTHLY -> buildMonthlyPeriods(from, to);
    };
  }

  private static List<Period> buildDailyPeriods(LocalDate from, LocalDate to) {
    List<Period> periods = new ArrayList<>();
    LocalDate current = from;
    while (!current.isAfter(to)) {
      periods.add(new Period(current, current));
      current = current.plusDays(1);
    }
    return periods;
  }

  private static List<Period> buildWeeklyPeriods(LocalDate from, LocalDate to) {
    // ISO weeks: Monday = start of week
    List<Period> periods = new ArrayList<>();
    LocalDate weekStart = from.with(WeekFields.ISO.dayOfWeek(), DayOfWeek.MONDAY.getValue());
    if (weekStart.isAfter(from)) {
      weekStart = weekStart.minusWeeks(1);
    }
    while (!weekStart.isAfter(to)) {
      LocalDate weekEnd = weekStart.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
      LocalDate periodStart = weekStart.isBefore(from) ? from : weekStart;
      LocalDate periodEnd = weekEnd.isAfter(to) ? to : weekEnd;
      periods.add(new Period(periodStart, periodEnd));
      weekStart = weekStart.plusWeeks(1);
    }
    return periods;
  }

  private static List<Period> buildMonthlyPeriods(LocalDate from, LocalDate to) {
    List<Period> periods = new ArrayList<>();
    LocalDate monthStart = from.withDayOfMonth(1);
    while (!monthStart.isAfter(to)) {
      LocalDate monthEnd = monthStart.with(TemporalAdjusters.lastDayOfMonth());
      LocalDate periodStart = monthStart.isBefore(from) ? from : monthStart;
      LocalDate periodEnd = monthEnd.isAfter(to) ? to : monthEnd;
      periods.add(new Period(periodStart, periodEnd));
      monthStart = monthStart.plusMonths(1);
    }
    return periods;
  }

  // -------------------------------------------------------------------------
  // Pause evaluation
  // -------------------------------------------------------------------------

  /**
   * Returns true when every calendar day in the period is covered by at least one pause period.
   * Partly-paused periods (some days covered) remain eligible.
   */
  private static boolean isFullyPaused(Period period, List<HabitPausePeriod> pausePeriods) {
    LocalDate day = period.start();
    while (!day.isAfter(period.end())) {
      if (!isCoveredByAnyPause(day, pausePeriods)) {
        return false;
      }
      day = day.plusDays(1);
    }
    return true; // every day was covered
  }

  private static boolean isCoveredByAnyPause(LocalDate date, List<HabitPausePeriod> pauses) {
    for (HabitPausePeriod pause : pauses) {
      if (pause.covers(date)) {
        return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Entry aggregation
  // -------------------------------------------------------------------------

  private static int sumCount(Period period, Map<LocalDate, Integer> countByDate) {
    int total = 0;
    LocalDate day = period.start();
    while (!day.isAfter(period.end())) {
      total += countByDate.getOrDefault(day, 0);
      day = day.plusDays(1);
    }
    return total;
  }

  // -------------------------------------------------------------------------
  // Internal value type
  // -------------------------------------------------------------------------

  private record Period(LocalDate start, LocalDate end) {}
}
