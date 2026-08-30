package tech.buildwithpartha.lifeos.braindump.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public record BrainDumpItem(
    UUID id,
    UUID userId,
    String content,
    BrainDumpItemStatus status,
    Optional<String> convertedToType,
    Optional<UUID> convertedToId,
    Optional<Instant> convertedAt,
    Optional<Instant> archivedAt,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public BrainDumpItem {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(content, "content must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(convertedToType, "convertedToType must not be null");
    Objects.requireNonNull(convertedToId, "convertedToId must not be null");
    Objects.requireNonNull(convertedAt, "convertedAt must not be null");
    Objects.requireNonNull(archivedAt, "archivedAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");

    if (content.trim().isEmpty()) {
      throw new IllegalArgumentException("Content must not be blank");
    }
  }

  public BrainDumpItem archive(Instant now) {
    return new BrainDumpItem(
        id,
        userId,
        content,
        status,
        convertedToType,
        convertedToId,
        convertedAt,
        Optional.of(now),
        createdAt,
        now,
        version);
  }

  public BrainDumpItem restore(Instant now) {
    return new BrainDumpItem(
        id,
        userId,
        content,
        status,
        convertedToType,
        convertedToId,
        convertedAt,
        Optional.empty(),
        createdAt,
        now,
        version);
  }

  public BrainDumpItem defer(Instant now) {
    return new BrainDumpItem(
        id,
        userId,
        content,
        BrainDumpItemStatus.DEFERRED,
        convertedToType,
        convertedToId,
        convertedAt,
        archivedAt,
        createdAt,
        now,
        version);
  }

  public BrainDumpItem convert(String targetType, UUID targetId, Instant now) {
    return new BrainDumpItem(
        id,
        userId,
        content,
        BrainDumpItemStatus.CONVERTED,
        Optional.of(targetType),
        Optional.of(targetId),
        Optional.of(now),
        archivedAt,
        createdAt,
        now,
        version);
  }
}
