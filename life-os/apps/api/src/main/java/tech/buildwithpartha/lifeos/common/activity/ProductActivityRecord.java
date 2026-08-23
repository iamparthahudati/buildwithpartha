package tech.buildwithpartha.lifeos.common.activity;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Safe shared projection of one user-readable product Activity Event. */
public record ProductActivityRecord(
    UUID id,
    UUID userId,
    UUID actorUserId,
    ActivityEventType eventType,
    ActivitySubjectType subjectType,
    UUID subjectId,
    ActivitySubjectType objectType,
    UUID objectId,
    String correlationId,
    Instant occurredAt) {

  public ProductActivityRecord(
      UUID id,
      UUID userId,
      UUID actorUserId,
      ActivityEventType eventType,
      ActivitySubjectType subjectType,
      UUID subjectId,
      String correlationId,
      Instant occurredAt) {
    this(
        id,
        userId,
        actorUserId,
        eventType,
        subjectType,
        subjectId,
        subjectType,
        subjectId,
        correlationId,
        occurredAt);
  }

  public ProductActivityRecord {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(actorUserId, "actorUserId must not be null");
    Objects.requireNonNull(eventType, "eventType must not be null");
    Objects.requireNonNull(subjectType, "subjectType must not be null");
    Objects.requireNonNull(subjectId, "subjectId must not be null");
    Objects.requireNonNull(objectType, "objectType must not be null");
    Objects.requireNonNull(objectId, "objectId must not be null");
    Objects.requireNonNull(correlationId, "correlationId must not be null");
    Objects.requireNonNull(occurredAt, "occurredAt must not be null");
  }
}
