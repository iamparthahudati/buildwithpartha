package tech.buildwithpartha.lifeos.common.idempotency.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable domain representation of an idempotency execution record. */
public record IdempotencyRecord(
    UUID id,
    UUID userId,
    String idempotencyKey,
    String operationType,
    IdempotencyStatus status,
    Optional<Integer> responseCode,
    Optional<String> responseBody,
    Instant createdAt,
    Instant expiresAt) {

  public IdempotencyRecord {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(idempotencyKey, "idempotencyKey must not be null");
    Objects.requireNonNull(operationType, "operationType must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(responseCode, "responseCode must not be null");
    Objects.requireNonNull(responseBody, "responseBody must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(expiresAt, "expiresAt must not be null");
  }
}
