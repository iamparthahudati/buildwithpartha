package tech.buildwithpartha.lifeos.note.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Immutable domain record representing a Note with validation invariants. */
public record Note(
    UUID id,
    UUID userId,
    String title,
    String body,
    boolean pinned,
    boolean archived,
    Instant createdAt,
    Instant updatedAt,
    Set<UUID> labelIds,
    List<NoteLink> links,
    long version) {

  public Note {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(body, "body must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    Objects.requireNonNull(labelIds, "labelIds must not be null");
    Objects.requireNonNull(links, "links must not be null");

    if (title.trim().isEmpty()) {
      throw new IllegalArgumentException("Title must not be blank");
    }
  }

  public Note withUpdates(
      String newTitle,
      String newBody,
      Set<UUID> newLabelIds,
      List<NoteLink> newLinks,
      Instant newUpdatedAt) {
    return new Note(
        id,
        userId,
        newTitle != null ? newTitle : title,
        newBody != null ? newBody : body,
        pinned,
        archived,
        createdAt,
        newUpdatedAt,
        newLabelIds != null ? newLabelIds : labelIds,
        newLinks != null ? newLinks : links,
        version);
  }

  public Note pin(Instant newUpdatedAt) {
    return new Note(
        id, userId, title, body, true, archived, createdAt, newUpdatedAt, labelIds, links, version);
  }

  public Note unpin(Instant newUpdatedAt) {
    return new Note(
        id,
        userId,
        title,
        body,
        false,
        archived,
        createdAt,
        newUpdatedAt,
        labelIds,
        links,
        version);
  }

  public Note archive(Instant newUpdatedAt) {
    return new Note(
        id, userId, title, body, pinned, true, createdAt, newUpdatedAt, labelIds, links, version);
  }

  public Note restore(Instant newUpdatedAt) {
    return new Note(
        id, userId, title, body, pinned, false, createdAt, newUpdatedAt, labelIds, links, version);
  }

  @Override
  public String toString() {
    return "Note[id="
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
