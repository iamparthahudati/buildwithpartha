package tech.buildwithpartha.lifeos.focus.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionOperation;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionOperationType;

/** JPA mapping for content-free Focus Session idempotency records. */
@Entity
@Table(name = "focus_session_operations", schema = "public")
class FocusSessionOperationEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "idempotency_key", nullable = false, updatable = false, length = 64)
  private String idempotencyKey;

  @Enumerated(EnumType.STRING)
  @Column(name = "operation_type", nullable = false, updatable = false)
  private FocusSessionOperationType type;

  @Column(name = "focus_session_id", nullable = false, updatable = false)
  private UUID focusSessionId;

  @Column(name = "interruption_id", updatable = false)
  private UUID interruptionId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected FocusSessionOperationEntity() {}

  private FocusSessionOperationEntity(FocusSessionOperation operation) {
    id = operation.id();
    userId = operation.userId();
    idempotencyKey = operation.idempotencyKey();
    type = operation.type();
    focusSessionId = operation.focusSessionId();
    interruptionId = operation.interruptionId().orElse(null);
    createdAt = operation.createdAt();
  }

  static FocusSessionOperationEntity fromDomain(FocusSessionOperation operation) {
    return new FocusSessionOperationEntity(operation);
  }

  FocusSessionOperation toDomain() {
    return new FocusSessionOperation(
        id,
        userId,
        idempotencyKey,
        type,
        focusSessionId,
        Optional.ofNullable(interruptionId),
        createdAt);
  }
}
