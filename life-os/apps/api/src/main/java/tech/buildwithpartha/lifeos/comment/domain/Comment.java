package tech.buildwithpartha.lifeos.comment.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;

/** Immutable personal Comment attached to one Task or Project. */
public record Comment(
    UUID id,
    UUID userId,
    CommentParentType parentType,
    UUID parentId,
    String body,
    CommentFormat format,
    Instant createdAt,
    Instant updatedAt,
    Optional<Instant> editedAt,
    long version) {

  public Comment {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(parentType, "parentType must not be null");
    Objects.requireNonNull(parentId, "parentId must not be null");
    Objects.requireNonNull(body, "body must not be null");
    Objects.requireNonNull(format, "format must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
    editedAt = Objects.requireNonNull(editedAt, "editedAt must not be null");
    if (body.isBlank()) {
      throw new IllegalArgumentException("body must not be blank");
    }
    if (body.length() > CommentBodyPolicy.MAX_STORED_LENGTH) {
      throw new IllegalArgumentException("body exceeds the stored length limit");
    }
    if (version < 0) {
      throw new IllegalArgumentException("version must not be negative");
    }
  }

  public static Comment create(
      UUID id,
      UUID userId,
      CommentParentType parentType,
      UUID parentId,
      String body,
      CommentFormat format,
      Instant now) {
    return new Comment(
        id, userId, parentType, parentId, body, format, now, now, Optional.empty(), 0);
  }

  public Comment edit(String updatedBody, CommentFormat updatedFormat, Instant now) {
    return new Comment(
        id,
        userId,
        parentType,
        parentId,
        updatedBody,
        updatedFormat,
        createdAt,
        now,
        Optional.of(now),
        version);
  }
}
