package tech.buildwithpartha.lifeos.note.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Immutable domain record connecting a Note to a target project, task, or goal. */
public record NoteLink(
    UUID id,
    UUID noteId,
    UUID userId,
    NoteLinkTargetType targetType,
    UUID targetId,
    Instant createdAt) {

  public NoteLink {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(noteId, "noteId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(targetType, "targetType must not be null");
    Objects.requireNonNull(targetId, "targetId must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
  }

  /** Returns true if this link belongs to the specified user ID. */
  public boolean isOwnedBy(UUID ownerId) {
    Objects.requireNonNull(ownerId, "ownerId must not be null");
    return userId.equals(ownerId);
  }
}
