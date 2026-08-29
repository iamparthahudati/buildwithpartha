package tech.buildwithpartha.lifeos.focus.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Private interruption event attached to one user-owned Focus Session. */
public record FocusSessionInterruption(
    UUID id,
    UUID focusSessionId,
    UUID userId,
    Instant occurredAt,
    Optional<String> note,
    Instant createdAt,
    long version) {

  public FocusSessionInterruption {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(focusSessionId, "focusSessionId must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(occurredAt, "occurredAt must not be null");
    Objects.requireNonNull(note, "note must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    note = note.map(String::trim);
    if (note.filter(value -> value.isEmpty() || value.length() > 2000).isPresent()) {
      throw new IllegalArgumentException("Interruption note must contain 1 to 2000 characters");
    }
    if (occurredAt.isAfter(createdAt)) {
      throw new IllegalArgumentException("occurredAt must not be after createdAt");
    }
    if (version < 0) {
      throw new IllegalArgumentException("version must not be negative");
    }
  }

  static FocusSessionInterruption record(
      UUID id, UUID focusSessionId, UUID userId, Instant now, String note) {
    return new FocusSessionInterruption(
        id,
        focusSessionId,
        userId,
        now,
        Optional.ofNullable(note).map(String::trim).filter(value -> !value.isEmpty()),
        now,
        0);
  }
}
