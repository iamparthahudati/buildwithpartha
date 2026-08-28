package tech.buildwithpartha.lifeos.note.api;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import tech.buildwithpartha.lifeos.note.domain.NoteLink;
import tech.buildwithpartha.lifeos.note.domain.NoteLinkTargetType;

/** Response DTO representing a Note link. */
public record NoteLinkResponse(
    UUID id,
    UUID noteId,
    UUID userId,
    NoteLinkTargetType targetType,
    UUID targetId,
    Instant createdAt) {

  public static NoteLinkResponse fromDomain(NoteLink domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    return new NoteLinkResponse(
        domain.id(),
        domain.noteId(),
        domain.userId(),
        domain.targetType(),
        domain.targetId(),
        domain.createdAt());
  }
}
