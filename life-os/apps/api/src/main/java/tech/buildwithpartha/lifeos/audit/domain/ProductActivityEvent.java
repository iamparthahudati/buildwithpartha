package tech.buildwithpartha.lifeos.audit.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityRecord;

/** Immutable persisted product Activity Event. */
public record ProductActivityEvent(
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

  public ProductActivityEvent(
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

  private static final Pattern SAFE_CORRELATION_ID =
      Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");

  public ProductActivityEvent {
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
    if (!userId.equals(actorUserId)) {
      throw new IllegalArgumentException("actorUserId must match userId for personal Activity");
    }
    if (!SAFE_CORRELATION_ID.matcher(correlationId).matches()) {
      throw new IllegalArgumentException("correlationId must use the safe correlation format");
    }
  }

  public ProductActivityRecord toRecord() {
    return new ProductActivityRecord(
        id,
        userId,
        actorUserId,
        eventType,
        subjectType,
        subjectId,
        objectType,
        objectId,
        correlationId,
        occurredAt);
  }
}
