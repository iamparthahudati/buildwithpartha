package tech.buildwithpartha.lifeos.audit.application;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectReference;

/** User-scoped Activity Event plus its optional current object link. */
public record ActivityReadItem(
    UUID id,
    UUID actorUserId,
    ActivityEventType eventType,
    Optional<ActivityObjectReference> object,
    Instant occurredAt) {

  public ActivityReadItem {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(actorUserId, "actorUserId must not be null");
    Objects.requireNonNull(eventType, "eventType must not be null");
    Objects.requireNonNull(object, "object must not be null");
    Objects.requireNonNull(occurredAt, "occurredAt must not be null");
  }
}
