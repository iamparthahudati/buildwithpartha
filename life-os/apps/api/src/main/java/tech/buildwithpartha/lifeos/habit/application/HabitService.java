package tech.buildwithpartha.lifeos.habit.application;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.habit.domain.Habit;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntry;
import tech.buildwithpartha.lifeos.habit.domain.HabitEntryRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriod;
import tech.buildwithpartha.lifeos.habit.domain.HabitPausePeriodRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitRepository;
import tech.buildwithpartha.lifeos.habit.domain.HabitStreakCalculator;
import tech.buildwithpartha.lifeos.habit.domain.HabitStreakResult;

/**
 * Transactional service for the Habit lifecycle (LOS-1209): CRUD, archive/restore, pause periods,
 * dated completion entries (increment/set/remove) and window statistics. Every operation is scoped
 * to the authenticated user; a habit that is not owned is reported as not found so ownership never
 * leaks. Completion recording is idempotent at the ({@code habitId}, {@code localDate}) grain — a
 * second completion on the same local day updates the single existing row rather than inserting a
 * duplicate.
 */
@Service
public class HabitService {

  public static final long MAX_RANGE_DAYS = 366;

  private final HabitRepository habitRepository;
  private final HabitEntryRepository habitEntryRepository;
  private final HabitPausePeriodRepository habitPausePeriodRepository;
  private final Clock clock;

  public HabitService(
      HabitRepository habitRepository,
      HabitEntryRepository habitEntryRepository,
      HabitPausePeriodRepository habitPausePeriodRepository,
      Clock clock) {
    this.habitRepository =
        Objects.requireNonNull(habitRepository, "habitRepository must not be null");
    this.habitEntryRepository =
        Objects.requireNonNull(habitEntryRepository, "habitEntryRepository must not be null");
    this.habitPausePeriodRepository =
        Objects.requireNonNull(
            habitPausePeriodRepository, "habitPausePeriodRepository must not be null");
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  // --- Habit CRUD -----------------------------------------------------------

  @Transactional
  public Habit createHabit(UUID userId, CreateHabitCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Instant now = clock.instant();
    Habit habit =
        new Habit(
            UUID.randomUUID(),
            userId,
            command.name(),
            command.description(),
            command.cadence(),
            command.targetCount(),
            command.timeZone(),
            command.color(),
            command.reminderEnabled(),
            command.reminderTime(),
            false,
            now,
            now,
            0L);
    return habitRepository.save(habit);
  }

  @Transactional(readOnly = true)
  public Habit getHabit(UUID userId, UUID habitId) {
    return requireOwnedHabit(userId, habitId);
  }

  @Transactional(readOnly = true)
  public List<Habit> listHabits(UUID userId, Optional<Boolean> archived) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(archived, "archived must not be null");
    return archived
        .map(value -> habitRepository.findByUserIdAndArchived(userId, value))
        .orElseGet(() -> habitRepository.findByUserId(userId));
  }

  @Transactional
  public Habit updateHabit(UUID userId, UUID habitId, UpdateHabitCommand command, long version) {
    Objects.requireNonNull(command, "command must not be null");

    Habit existing = requireOwnedHabit(userId, habitId);
    checkVersion(existing, version);

    Habit updated =
        existing.withDetails(
            command.name(),
            command.description(),
            command.cadence(),
            command.targetCount(),
            command.timeZone(),
            command.color(),
            command.reminderEnabled(),
            command.reminderTime(),
            clock.instant());
    return habitRepository.save(updated);
  }

  @Transactional
  public Habit archiveHabit(UUID userId, UUID habitId, long version) {
    Habit existing = requireOwnedHabit(userId, habitId);
    checkVersion(existing, version);
    if (existing.archived()) {
      return existing;
    }
    return habitRepository.save(existing.archive(clock.instant()));
  }

  @Transactional
  public Habit restoreHabit(UUID userId, UUID habitId, long version) {
    Habit existing = requireOwnedHabit(userId, habitId);
    checkVersion(existing, version);
    if (!existing.archived()) {
      return existing;
    }
    return habitRepository.save(existing.restore(clock.instant()));
  }

  @Transactional
  public void deleteHabit(UUID userId, UUID habitId) {
    Habit existing = requireOwnedHabit(userId, habitId);
    // Explicit application-level cascade: the H2 test schema (and any DB whose FK cascade differs)
    // must not be relied on to remove dependent rows. PostgreSQL also cascades via ON DELETE
    // CASCADE, so this is belt-and-braces on the platform and correct everywhere else.
    habitEntryRepository.findByHabitId(habitId).forEach(habitEntryRepository::delete);
    habitPausePeriodRepository.findByHabitId(habitId).forEach(habitPausePeriodRepository::delete);
    habitRepository.delete(existing);
  }

  // --- Completion entries ---------------------------------------------------

  @Transactional(readOnly = true)
  public List<HabitEntry> listEntries(UUID userId, UUID habitId, LocalDate from, LocalDate to) {
    Objects.requireNonNull(from, "from must not be null");
    Objects.requireNonNull(to, "to must not be null");
    validateRange(from, to);
    requireOwnedHabit(userId, habitId);
    return habitEntryRepository.findByHabitIdAndLocalDateBetween(habitId, from, to);
  }

  /** Today's completion entries in the habit's own timezone (zero or one row). */
  @Transactional(readOnly = true)
  public List<HabitEntry> listToday(UUID userId, UUID habitId) {
    Habit habit = requireOwnedHabit(userId, habitId);
    LocalDate today = habit.localDateFor(clock.instant());
    return habitEntryRepository.findByHabitIdAndLocalDateBetween(habitId, today, today);
  }

  /**
   * Records (or increments) a completion. An empty {@code date} resolves to the habit's own "today"
   * in its timezone. Idempotent at the ({@code habitId}, local date) grain — the single existing
   * row is incremented rather than duplicated.
   */
  @Transactional
  public HabitEntry recordCompletion(UUID userId, UUID habitId, Optional<LocalDate> date, int by) {
    Objects.requireNonNull(date, "date must not be null");
    if (by <= 0) {
      throw new IllegalArgumentException("increment must be positive");
    }
    Habit habit = requireOwnedHabit(userId, habitId);
    LocalDate localDate = resolveDate(habit, date);

    Instant now = clock.instant();
    HabitEntry entry =
        habitEntryRepository
            .findByHabitIdAndLocalDate(habitId, localDate)
            .map(existing -> existing.increment(by, now))
            .orElseGet(
                () ->
                    new HabitEntry(
                        UUID.randomUUID(),
                        habit.id(),
                        habit.userId(),
                        localDate,
                        by,
                        now,
                        now,
                        0L));
    return habitEntryRepository.save(entry);
  }

  /**
   * Sets the absolute completed count for a local date, creating the entry if needed. An empty
   * {@code date} resolves to the habit's own "today".
   */
  @Transactional
  public HabitEntry setCount(UUID userId, UUID habitId, Optional<LocalDate> date, int count) {
    Objects.requireNonNull(date, "date must not be null");
    if (count <= 0) {
      throw new IllegalArgumentException("count must be positive");
    }
    Habit habit = requireOwnedHabit(userId, habitId);
    LocalDate localDate = resolveDate(habit, date);

    Instant now = clock.instant();
    HabitEntry entry =
        habitEntryRepository
            .findByHabitIdAndLocalDate(habitId, localDate)
            .map(existing -> existing.withCount(count, now))
            .orElseGet(
                () ->
                    new HabitEntry(
                        UUID.randomUUID(),
                        habit.id(),
                        habit.userId(),
                        localDate,
                        count,
                        now,
                        now,
                        0L));
    return habitEntryRepository.save(entry);
  }

  /**
   * Removes a completion entry for a local date. An empty {@code date} resolves to the habit's own
   * "today". Idempotent: a no-op when none exists.
   */
  @Transactional
  public void removeEntry(UUID userId, UUID habitId, Optional<LocalDate> date) {
    Objects.requireNonNull(date, "date must not be null");
    Habit habit = requireOwnedHabit(userId, habitId);
    LocalDate localDate = resolveDate(habit, date);
    habitEntryRepository
        .findByHabitIdAndLocalDate(habitId, localDate)
        .ifPresent(habitEntryRepository::delete);
  }

  private LocalDate resolveDate(Habit habit, Optional<LocalDate> date) {
    return date.orElseGet(() -> habit.localDateFor(clock.instant()));
  }

  // --- Pause periods --------------------------------------------------------

  @Transactional
  public HabitPausePeriod addPause(
      UUID userId,
      UUID habitId,
      LocalDate startDate,
      Optional<LocalDate> endDate,
      Optional<String> reason) {
    Objects.requireNonNull(startDate, "startDate must not be null");
    Objects.requireNonNull(endDate, "endDate must not be null");
    Objects.requireNonNull(reason, "reason must not be null");
    Habit habit = requireOwnedHabit(userId, habitId);

    HabitPausePeriod pause =
        new HabitPausePeriod(
            UUID.randomUUID(),
            habit.id(),
            habit.userId(),
            startDate,
            endDate,
            reason,
            clock.instant());
    return habitPausePeriodRepository.save(pause);
  }

  @Transactional(readOnly = true)
  public List<HabitPausePeriod> listPauses(UUID userId, UUID habitId) {
    requireOwnedHabit(userId, habitId);
    return habitPausePeriodRepository.findByHabitId(habitId);
  }

  @Transactional
  public void removePause(UUID userId, UUID habitId, UUID pauseId) {
    Objects.requireNonNull(pauseId, "pauseId must not be null");
    requireOwnedHabit(userId, habitId);
    HabitPausePeriod pause =
        habitPausePeriodRepository
            .findById(pauseId)
            .filter(candidate -> candidate.habitId().equals(habitId) && candidate.isOwnedBy(userId))
            .orElseThrow(
                () -> new ResourceNotFoundException("Habit pause period not found: " + pauseId));
    habitPausePeriodRepository.delete(pause);
  }

  // --- Statistics -----------------------------------------------------------

  @Transactional(readOnly = true)
  public HabitStatistics statistics(UUID userId, UUID habitId, LocalDate from, LocalDate to) {
    Objects.requireNonNull(from, "from must not be null");
    Objects.requireNonNull(to, "to must not be null");
    validateRange(from, to);
    Habit habit = requireOwnedHabit(userId, habitId);

    List<HabitEntry> entries =
        habitEntryRepository.findByHabitIdAndLocalDateBetween(habitId, from, to);
    List<HabitPausePeriod> pausePeriods = habitPausePeriodRepository.findByHabitId(habitId);
    long totalDays = ChronoUnit.DAYS.between(from, to) + 1;
    long daysWithEntry = entries.size();
    long daysMeetingTarget =
        entries.stream().filter(entry -> entry.completedCount() >= habit.targetCount()).count();
    long totalCompletions = entries.stream().mapToLong(HabitEntry::completedCount).sum();
    double completionRate = totalDays <= 0 ? 0.0 : (double) daysMeetingTarget / (double) totalDays;
    HabitStreakResult streak =
        HabitStreakCalculator.calculate(habit, entries, pausePeriods, from, to);

    return new HabitStatistics(
        from,
        to,
        totalDays,
        daysWithEntry,
        daysMeetingTarget,
        totalCompletions,
        completionRate,
        streak);
  }

  // --- Helpers --------------------------------------------------------------

  private Habit requireOwnedHabit(UUID userId, UUID habitId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(habitId, "habitId must not be null");
    return habitRepository
        .findByIdAndUserId(habitId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Habit not found: " + habitId));
  }

  private void checkVersion(Habit habit, long expectedVersion) {
    if (habit.version() != expectedVersion) {
      throw new ConcurrencyConflictException("Habit was modified concurrently: " + habit.id());
    }
  }

  private void validateRange(LocalDate from, LocalDate to) {
    if (to.isBefore(from)) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("to", "INVALID_DATE_RANGE")));
    }
    if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_RANGE_DAYS) {
      throw new FieldValidationException(
          "Validation failed", List.of(new FieldProblem("to", "RANGE_TOO_LARGE")));
    }
  }
}
