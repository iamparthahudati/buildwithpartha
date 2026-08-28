package tech.buildwithpartha.lifeos.focus.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Content-free record used to replay a Focus Session mutation exactly once. */
public record FocusSessionOperation(
    UUID id,
    UUID userId,
    String idempotencyKey,
    FocusSessionOperationType type,
    UUID focusSessionId,
    Optional<UUID> interruptionId,
    Instant createdAt) {

  public FocusSessionOperation {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(idempotencyKey, "idempotencyKey must not be null");
    Objects.requireNonNull(type, "type must not be null");
    Objects.requireNonNull(focusSessionId, "focusSessionId must not be null");
    Objects.requireNonNull(interruptionId, "interruptionId must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    idempotencyKey = idempotencyKey.trim();
    if (!idempotencyKey.matches("[A-Za-z0-9][A-Za-z0-9._-]{7,63}")) {
      throw new IllegalArgumentException(
          "idempotencyKey must contain 8 to 64 safe ASCII characters");
    }
    if ((type == FocusSessionOperationType.RECORD_INTERRUPTION) != interruptionId.isPresent()) {
      throw new IllegalArgumentException("interruptionId must match the operation type");
    }
  }
}
