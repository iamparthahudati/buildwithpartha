package tech.buildwithpartha.lifeos.label.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Immutable domain record representing a user-defined classification label. */
public record Label(
    UUID id,
    UUID userId,
    String name,
    String nameNormalized,
    String color,
    Instant createdAt,
    Instant updatedAt,
    long version) {
  public Label {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(name, "name must not be null");
    Objects.requireNonNull(nameNormalized, "nameNormalized must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
  }
}
