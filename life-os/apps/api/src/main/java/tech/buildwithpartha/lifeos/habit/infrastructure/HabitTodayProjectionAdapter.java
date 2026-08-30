package tech.buildwithpartha.lifeos.habit.infrastructure;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.habit.HabitTodayProjection;
import tech.buildwithpartha.lifeos.common.habit.HabitTodayProjectionProvider;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriodRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitStreakCalculator;

/** Owner-scoped adapter from canonical Habit records to the compact Today projection. */
@Component
public class HabitTodayProjectionAdapter implements HabitTodayProjectionProvider {

  private final HabitRepository habitRepository;
  private final HabitEntryRepository entryRepository;
  private final HabitPausePeriodRepository pauseRepository;
  private final Clock clock;

  public HabitTodayProjectionAdapter(
      HabitRepository habitRepository,
      HabitEntryRepository entryRepository,
      HabitPausePeriodRepository pauseRepository,
      Clock clock) {
    this.habitRepository =
        Objects.requireNonNull(habitRepository, "habitRepository must not be null");
    this.entryRepository =
        Objects.requireNonNull(entryRepository, "entryRepository must not be null");
    this.pauseRepository =
        Objects.requireNonNull(pauseRepository, "pauseRepository must not be null");
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  @Override
  @Transactional(readOnly = true)
  public List<HabitTodayProjection> getTodayHabits(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return habitRepository.findByUserIdAndArchived(userId, false).stream()
        .sorted(Comparator.comparing(Habit::name, String.CASE_INSENSITIVE_ORDER))
        .map(this::toProjection)
        .toList();
  }

  private HabitTodayProjection toProjection(Habit habit) {
    LocalDate localDate = habit.localDateFor(clock.instant());
    List<HabitEntry> entries = entryRepository.findByHabitId(habit.id());
    List<HabitPausePeriod> pauses = pauseRepository.findByHabitId(habit.id());
    int completedCount =
        entries.stream()
            .filter(entry -> entry.localDate().equals(localDate))
            .mapToInt(HabitEntry::completedCount)
            .sum();
    boolean paused = pauses.stream().anyMatch(period -> period.covers(localDate));
    LocalDate firstDate =
        entries.stream()
            .map(HabitEntry::localDate)
            .min(LocalDate::compareTo)
            .orElse(habit.createdAt().atZone(habit.zoneId()).toLocalDate());
    int currentStreak =
        HabitStreakCalculator.calculate(habit, entries, pauses, firstDate, localDate)
            .currentStreak();

    return new HabitTodayProjection(
        habit.id(),
        habit.name(),
        habit.cadence().name(),
        habit.targetCount(),
        completedCount,
        localDate,
        habit.timeZone(),
        paused,
        currentStreak);
  }
}
