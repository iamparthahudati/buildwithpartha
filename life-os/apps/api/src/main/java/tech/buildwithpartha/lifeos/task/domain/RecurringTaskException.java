package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable domain record representing an occurrence exception in a recurring task series. */
public record RecurringTaskException(
    UUID id,
    UUID seriesId,
    UUID userId,
    LocalDate occurrenceDate,
    RecurrenceExceptionType exceptionType,
    Optional<LocalDate> rescheduledDate,
    Optional<UUID> overrideTaskId,
    Optional<String> reason,
    Instant createdAt) {

  public RecurringTaskException {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(seriesId, "seriesId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(occurrenceDate, "occurrenceDate must not be null");
    Objects.requireNonNull(exceptionType, "exceptionType must not be null");
    Objects.requireNonNull(rescheduledDate, "rescheduledDate must not be null");
    Objects.requireNonNull(overrideTaskId, "overrideTaskId must not be null");
    Objects.requireNonNull(reason, "reason must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");

    if (exceptionType == RecurrenceExceptionType.RESCHEDULED && rescheduledDate.isEmpty()) {
      throw new IllegalArgumentException(
          "rescheduledDate must be provided when exceptionType is RESCHEDULED");
    }
  }

  public RecurringTaskException(
      UUID id,
      UUID seriesId,
      UUID userId,
      LocalDate occurrenceDate,
      RecurrenceExceptionType exceptionType,
      LocalDate rescheduledDate,
      UUID overrideTaskId,
      String reason,
      Instant createdAt) {
    this(
        id,
        seriesId,
        userId,
        occurrenceDate,
        exceptionType,
        Optional.ofNullable(rescheduledDate),
        Optional.ofNullable(overrideTaskId),
        Optional.ofNullable(reason),
        createdAt);
  }
}
