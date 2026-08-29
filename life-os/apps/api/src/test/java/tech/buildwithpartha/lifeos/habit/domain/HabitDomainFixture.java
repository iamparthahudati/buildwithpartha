package tech.buildwithpartha.lifeos.habit.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

public final class HabitDomainFixture {

  private HabitDomainFixture() {}

  public static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  public static final UUID OTHER_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
  public static final UUID HABIT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
  public static final UUID ENTRY_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
  public static final UUID PAUSE_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");

  public static Habit sampleDailyHabit() {
    return new Habit(
        HABIT_ID,
        USER_ID,
        "Drink water",
        Optional.of("Eight glasses a day"),
        HabitCadence.DAILY,
        8,
        "America/New_York",
        Optional.of("#3366FF"),
        true,
        Optional.of(LocalTime.of(9, 0)),
        false,
        Instant.parse("2026-01-01T00:00:00Z"),
        Instant.parse("2026-01-01T00:00:00Z"),
        0L);
  }

  public static Habit sampleWeeklyHabit() {
    return new Habit(
        UUID.randomUUID(),
        USER_ID,
        "Long run",
        Optional.empty(),
        HabitCadence.WEEKLY,
        3,
        "UTC",
        Optional.empty(),
        false,
        Optional.empty(),
        false,
        Instant.parse("2026-01-01T00:00:00Z"),
        Instant.parse("2026-01-01T00:00:00Z"),
        0L);
  }

  public static HabitEntry sampleEntry(UUID habitId) {
    return new HabitEntry(
        ENTRY_ID,
        habitId,
        USER_ID,
        LocalDate.of(2026, 2, 1),
        3,
        Instant.parse("2026-02-01T10:00:00Z"),
        Instant.parse("2026-02-01T10:00:00Z"),
        0L);
  }

  public static HabitPausePeriod samplePausePeriod(UUID habitId) {
    return new HabitPausePeriod(
        PAUSE_ID,
        habitId,
        USER_ID,
        LocalDate.of(2026, 3, 1),
        Optional.of(LocalDate.of(2026, 3, 10)),
        Optional.of("Vacation"),
        Instant.parse("2026-02-28T10:00:00Z"));
  }
}
