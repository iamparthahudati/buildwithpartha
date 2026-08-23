package tech.buildwithpartha.lifeos.common.activity;

import java.util.Objects;
import java.util.UUID;

/**
 * Content-free command for recording one product Activity Event.
 *
 * <p>The deliberately closed enum/UUID shape makes bodies, titles, credentials, tokens, cookies,
 * request metadata, and arbitrary maps impossible to submit through this interface.
 */
public record ProductActivityCommand(
    UUID userId,
    UUID actorUserId,
    ActivityEventType eventType,
    ActivitySubjectType subjectType,
    UUID subjectId) {

  public ProductActivityCommand {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(actorUserId, "actorUserId must not be null");
    Objects.requireNonNull(eventType, "eventType must not be null");
    Objects.requireNonNull(subjectType, "subjectType must not be null");
    Objects.requireNonNull(subjectId, "subjectId must not be null");
    if (!userId.equals(actorUserId)) {
      throw new IllegalArgumentException("actorUserId must match userId for personal Activity");
    }
  }
}
