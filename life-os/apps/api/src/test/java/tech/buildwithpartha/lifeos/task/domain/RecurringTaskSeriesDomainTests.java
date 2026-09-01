package tech.buildwithpartha.lifeos.task.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RecurringTaskSeriesDomainTests {

  private final UUID seriesId = UUID.randomUUID();
  private final UUID userId = UUID.randomUUID();
  private final Instant now = Instant.now();

  @Test
  @DisplayName("Constructs valid recurring task series domain aggregate")
  void constructsValidRecurringTaskSeries() {
    RecurringTaskSeries series =
        new RecurringTaskSeries(
            seriesId,
            userId,
            "Daily Team Sync",
            Optional.of("Daily standup meeting"),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.empty(),
            15,
            RecurrenceFrequency.DAILY,
            1,
            Optional.empty(),
            Optional.empty(),
            RecurrenceEndMode.NEVER,
            Optional.empty(),
            Optional.empty(),
            LocalDate.of(2026, 9, 1),
            "America/New_York",
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            0L);

    assertThat(series.id()).isEqualTo(seriesId);
    assertThat(series.userId()).isEqualTo(userId);
    assertThat(series.title()).isEqualTo("Daily Team Sync");
    assertThat(series.frequency()).isEqualTo(RecurrenceFrequency.DAILY);
    assertThat(series.endMode()).isEqualTo(RecurrenceEndMode.NEVER);
    assertThat(series.timeZone()).isEqualTo("America/New_York");
  }

  @Test
  @DisplayName("Throws exception when recurring task series title is blank")
  void throwsOnBlankTitle() {
    assertThatThrownBy(
            () ->
                new RecurringTaskSeries(
                    seriesId,
                    userId,
                    "   ",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    0,
                    RecurrenceFrequency.WEEKLY,
                    1,
                    Optional.of("MONDAY"),
                    Optional.empty(),
                    RecurrenceEndMode.NEVER,
                    Optional.empty(),
                    Optional.empty(),
                    LocalDate.of(2026, 9, 1),
                    "UTC",
                    Optional.empty(),
                    Optional.empty(),
                    now,
                    now,
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("title must not be blank");
  }

  @Test
  @DisplayName("Throws exception when interval value is less than 1")
  void throwsOnInvalidInterval() {
    assertThatThrownBy(
            () ->
                new RecurringTaskSeries(
                    seriesId,
                    userId,
                    "Workout",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    30,
                    RecurrenceFrequency.INTERVAL,
                    0,
                    Optional.empty(),
                    Optional.empty(),
                    RecurrenceEndMode.NEVER,
                    Optional.empty(),
                    Optional.empty(),
                    LocalDate.of(2026, 9, 1),
                    "UTC",
                    Optional.empty(),
                    Optional.empty(),
                    now,
                    now,
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Interval value must be at least 1");
  }

  @Test
  @DisplayName("Throws exception when time zone is invalid")
  void throwsOnInvalidTimeZone() {
    assertThatThrownBy(
            () ->
                new RecurringTaskSeries(
                    seriesId,
                    userId,
                    "Invalid Zone",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    0,
                    RecurrenceFrequency.DAILY,
                    1,
                    Optional.empty(),
                    Optional.empty(),
                    RecurrenceEndMode.NEVER,
                    Optional.empty(),
                    Optional.empty(),
                    LocalDate.of(2026, 9, 1),
                    "Invalid/Timezone_ID",
                    Optional.empty(),
                    Optional.empty(),
                    now,
                    now,
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Invalid time zone");
  }

  @Test
  @DisplayName("Throws exception when UNTIL_DATE mode missing endDate")
  void throwsOnUntilDateMissingEndDate() {
    assertThatThrownBy(
            () ->
                new RecurringTaskSeries(
                    seriesId,
                    userId,
                    "Project Review",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    0,
                    RecurrenceFrequency.MONTHLY,
                    1,
                    Optional.empty(),
                    Optional.of(15),
                    RecurrenceEndMode.UNTIL_DATE,
                    Optional.empty(),
                    Optional.empty(),
                    LocalDate.of(2026, 9, 1),
                    "UTC",
                    Optional.empty(),
                    Optional.empty(),
                    now,
                    now,
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("endDate must be provided when endMode is UNTIL_DATE");
  }

  @Test
  @DisplayName("Throws exception when COUNT mode has missing or zero endCount")
  void throwsOnCountModeInvalidEndCount() {
    assertThatThrownBy(
            () ->
                new RecurringTaskSeries(
                    seriesId,
                    userId,
                    "Language Class",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    60,
                    RecurrenceFrequency.WEEKLY,
                    1,
                    Optional.of("TUESDAY"),
                    Optional.empty(),
                    RecurrenceEndMode.COUNT,
                    Optional.empty(),
                    Optional.of(0),
                    LocalDate.of(2026, 9, 1),
                    "UTC",
                    Optional.empty(),
                    Optional.empty(),
                    now,
                    now,
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("endCount must be at least 1 when endMode is COUNT");
  }

  @Test
  @DisplayName("Constructs valid recurring task exception record")
  void constructsValidRecurringTaskException() {
    UUID exceptionId = UUID.randomUUID();
    LocalDate occurrenceDate = LocalDate.of(2026, 9, 5);
    LocalDate rescheduled = LocalDate.of(2026, 9, 6);

    RecurringTaskException exception =
        new RecurringTaskException(
            exceptionId,
            seriesId,
            userId,
            occurrenceDate,
            RecurrenceExceptionType.RESCHEDULED,
            Optional.of(rescheduled),
            Optional.empty(),
            Optional.of("Personal holiday"),
            now);

    assertThat(exception.id()).isEqualTo(exceptionId);
    assertThat(exception.seriesId()).isEqualTo(seriesId);
    assertThat(exception.occurrenceDate()).isEqualTo(occurrenceDate);
    assertThat(exception.exceptionType()).isEqualTo(RecurrenceExceptionType.RESCHEDULED);
    assertThat(exception.rescheduledDate()).contains(rescheduled);
  }

  @Test
  @DisplayName("Throws exception when RESCHEDULED exception missing rescheduledDate")
  void throwsOnRescheduledExceptionMissingDate() {
    UUID exceptionId = UUID.randomUUID();
    LocalDate occurrenceDate = LocalDate.of(2026, 9, 5);

    assertThatThrownBy(
            () ->
                new RecurringTaskException(
                    exceptionId,
                    seriesId,
                    userId,
                    occurrenceDate,
                    RecurrenceExceptionType.RESCHEDULED,
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    now))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("rescheduledDate must be provided when exceptionType is RESCHEDULED");
  }
}
