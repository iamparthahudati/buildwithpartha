package tech.buildwithpartha.lifeos.note.api;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.note.domain.Note;

/** Response DTO representing a Note entity. */
public record NoteResponse(
    UUID id,
    UUID userId,
    String title,
    String body,
    boolean pinned,
    boolean archived,
    Instant createdAt,
    Instant updatedAt,
    Set<UUID> labelIds,
    List<NoteLinkResponse> links,
    long version) {

  public static NoteResponse fromDomain(Note domain) {
    Objects.requireNonNull(domain, "domain must not be null");
    List<NoteLinkResponse> linkResponses =
        domain.links().stream().map(NoteLinkResponse::fromDomain).toList();
    return new NoteResponse(
        domain.id(),
        domain.userId(),
        domain.title(),
        domain.body(),
        domain.pinned(),
        domain.archived(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.labelIds(),
        linkResponses,
        domain.version());
  }

  @Override
  public String toString() {
    return "NoteResponse[id="
        + id
        + ", userId="
        + userId
        + ", title="
        + title
        + ", body=[REDACTED]"
        + ", pinned="
        + pinned
        + ", archived="
        + archived
        + ", createdAt="
        + createdAt
        + ", updatedAt="
        + updatedAt
        + ", labelIds="
        + labelIds
        + ", links="
        + links
        + ", version="
        + version
        + "]";
  }
}
