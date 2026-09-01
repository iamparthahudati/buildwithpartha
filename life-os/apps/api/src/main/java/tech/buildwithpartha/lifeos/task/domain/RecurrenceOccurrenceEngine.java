package tech.buildwithpartha.lifeos.task.domain;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Pure domain engine for calculating occurrence dates of a {@link RecurringTaskSeries}. Handles
 * cadence rules (DAILY, WEEKLY, MONTHLY, WEEKDAY, INTERVAL, AFTER_COMPLETION), end rules (NEVER,
 * UNTIL_DATE, COUNT), month-end clamping, and leap years.
 */
public final class RecurrenceOccurrenceEngine {

  private RecurrenceOccurrenceEngine() {}

  /**
   * Generates candidate occurrence dates for a series from its start date up to {@code horizon}.
   *
   * @param series the recurring task series configuration
   * @param horizon upper date boundary (inclusive) for calculated occurrences
   * @return list of calculated occurrence dates in chronological order
   */
  public static List<LocalDate> generateOccurrenceDates(
      RecurringTaskSeries series, LocalDate horizon) {
    Objects.requireNonNull(series, "series must not be null");
    Objects.requireNonNull(horizon, "horizon must not be null");

    if (horizon.isBefore(series.startDate())) {
      return List.of();
    }

    LocalDate effectiveEndDate = computeEffectiveEndDate(series, horizon);
    List<LocalDate> candidates = calculateUnboundedDates(series, effectiveEndDate);

    if (series.endMode() == RecurrenceEndMode.COUNT && series.endCount().isPresent()) {
      int count = series.endCount().get();
      if (candidates.size() > count) {
        candidates = candidates.subList(0, count);
      }
    }

    return candidates.stream().filter(date -> !date.isAfter(horizon)).collect(Collectors.toList());
  }

  private static LocalDate computeEffectiveEndDate(RecurringTaskSeries series, LocalDate horizon) {
    if (series.endMode() == RecurrenceEndMode.UNTIL_DATE && series.endDate().isPresent()) {
      LocalDate endDate = series.endDate().get();
      return endDate.isBefore(horizon) ? endDate : horizon;
    }
    return horizon;
  }

  private static List<LocalDate> calculateUnboundedDates(
      RecurringTaskSeries series, LocalDate endDate) {
    List<LocalDate> dates = new ArrayList<>();
    LocalDate start = series.startDate();
    int interval = Math.max(1, series.intervalValue());

    switch (series.frequency()) {
      case DAILY:
      case INTERVAL:
        for (LocalDate curr = start; !curr.isAfter(endDate); curr = curr.plusDays(interval)) {
          dates.add(curr);
        }
        break;

      case WEEKDAY:
        for (LocalDate curr = start; !curr.isAfter(endDate); curr = curr.plusDays(1)) {
          DayOfWeek dow = curr.getDayOfWeek();
          if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
            dates.add(curr);
          }
        }
        break;

      case WEEKLY:
        Set<DayOfWeek> targetDays = parseDaysOfWeek(series.daysOfWeek().orElse(null), start);
        LocalDate weekStart = start.minusDays(start.getDayOfWeek().getValue() - 1);
        for (LocalDate currWeek = weekStart;
            !currWeek.isAfter(endDate);
            currWeek = currWeek.plusWeeks(interval)) {
          for (DayOfWeek day : DayOfWeek.values()) {
            if (targetDays.contains(day)) {
              LocalDate date = currWeek.with(day);
              if (!date.isBefore(start) && !date.isAfter(endDate)) {
                dates.add(date);
              }
            }
          }
        }
        break;

      case MONTHLY:
        int targetDay = series.dayOfMonth().orElse(start.getDayOfMonth());
        LocalDate currMonth = start.withDayOfMonth(1);
        while (true) {
          int lastDay = currMonth.lengthOfMonth();
          int actualDay = Math.min(targetDay, lastDay);
          LocalDate occurrence = currMonth.withDayOfMonth(actualDay);
          if (occurrence.isAfter(endDate)) {
            break;
          }
          if (!occurrence.isBefore(start)) {
            dates.add(occurrence);
          }
          currMonth = currMonth.plusMonths(interval);
        }
        break;

      case AFTER_COMPLETION:
        // Initial occurrence starts on startDate
        if (!start.isAfter(endDate)) {
          dates.add(start);
        }
        break;
    }

    return dates;
  }

  private static Set<DayOfWeek> parseDaysOfWeek(String daysString, LocalDate defaultDate) {
    if (daysString == null || daysString.isBlank()) {
      return EnumSet.of(defaultDate.getDayOfWeek());
    }

    Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
    String[] parts = daysString.split(",");
    for (String part : parts) {
      String trimmed = part.trim().toUpperCase();
      if (!trimmed.isEmpty()) {
        try {
          days.add(DayOfWeek.valueOf(trimmed));
        } catch (IllegalArgumentException ignored) {
          // ignore malformed day names
        }
      }
    }

    if (days.isEmpty()) {
      days.add(defaultDate.getDayOfWeek());
    }

    return days;
  }
}
