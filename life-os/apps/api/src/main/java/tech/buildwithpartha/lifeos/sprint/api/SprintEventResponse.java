package tech.buildwithpartha.lifeos.sprint.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.sprint.domain.SprintEvent;
import tech.buildwithpartha.lifeos.sprint.domain.SprintEventType;

public record SprintEventResponse(
    UUID id,
    SprintEventType eventType,
    UUID taskId,
    Integer pointsDelta,
    String reason,
    Instant occurredAt) {
  static SprintEventResponse fromDomain(SprintEvent event) {
    return new SprintEventResponse(
        event.id(),
        event.eventType(),
        event.taskId().orElse(null),
        event.pointsDelta().orElse(null),
        event.reason().orElse(null),
        event.occurredAt());
  }
}
