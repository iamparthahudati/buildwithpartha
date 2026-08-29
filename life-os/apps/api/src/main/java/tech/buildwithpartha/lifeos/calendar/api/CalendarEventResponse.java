package tech.buildwithpartha.lifeos.calendar.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceEvent;
import tech.buildwithpartha.lifeos.common.calendar.CalendarSourceType;

/** Public Calendar event projection retaining the canonical source identity. */
public record CalendarEventResponse(
    String id,
    UUID sourceId,
    CalendarSourceType sourceType,
    String title,
    Instant startAt,
    Instant endAt,
    LocalDate localDate,
    boolean allDay,
    String status,
    UUID projectId,
    UUID taskId) {

  static CalendarEventResponse fromCommon(CalendarSourceEvent event) {
    return new CalendarEventResponse(
        event.id(),
        event.sourceId(),
        event.sourceType(),
        event.title(),
        event.startAt().orElse(null),
        event.endAt().orElse(null),
        event.localDate().orElse(null),
        event.allDay(),
        event.status(),
        event.projectId().orElse(null),
        event.taskId().orElse(null));
  }
}
