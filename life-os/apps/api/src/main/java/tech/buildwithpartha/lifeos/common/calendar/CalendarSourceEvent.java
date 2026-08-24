package tech.buildwithpartha.lifeos.common.calendar;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Domain-neutral projection of one canonical record or dated occurrence onto Calendar. */
public record CalendarSourceEvent(
    String id,
    UUID sourceId,
    CalendarSourceType sourceType,
    String title,
    Optional<Instant> startAt,
    Optional<Instant> endAt,
    Optional<LocalDate> localDate,
    boolean allDay,
    String status,
    Optional<UUID> projectId,
    Optional<UUID> taskId) {

  public CalendarSourceEvent {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(sourceId, "sourceId must not be null");
    Objects.requireNonNull(sourceType, "sourceType must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(startAt, "startAt must not be null");
    Objects.requireNonNull(endAt, "endAt must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(projectId, "projectId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    if (id.isBlank() || title.isBlank() || status.isBlank()) {
      throw new IllegalArgumentException("Calendar event text fields must not be blank");
    }
    if (allDay && (localDate.isEmpty() || startAt.isPresent() || endAt.isPresent())) {
      throw new IllegalArgumentException(
          "All-day events require only localDate and no instant bounds");
    }
    if (!allDay && (startAt.isEmpty() || localDate.isPresent())) {
      throw new IllegalArgumentException("Timed events require startAt and no localDate");
    }
    if (endAt.isPresent() && startAt.isEmpty()) {
      throw new IllegalArgumentException("An event with endAt requires startAt");
    }
    if (endAt.isPresent() && !endAt.get().isAfter(startAt.orElseThrow())) {
      throw new IllegalArgumentException("endAt must be after startAt");
    }
  }
}
