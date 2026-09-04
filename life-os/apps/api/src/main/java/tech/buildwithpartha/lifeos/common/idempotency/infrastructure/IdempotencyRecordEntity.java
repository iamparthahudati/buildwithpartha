package tech.buildwithpartha.lifeos.common.idempotency.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.idempotency.domain.IdempotencyRecord;
import tech.buildwithpartha.lifeos.common.idempotency.domain.IdempotencyStatus;

/**
 * JPA entity mapping for {@code public.idempotency_records} ({@code V33__idempotency_schema.sql}).
 */
@Entity
@Table(name = "idempotency_records", schema = "public")
public class IdempotencyRecordEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "idempotency_key", nullable = false, updatable = false, length = 64)
  private String idempotencyKey;

  @Column(name = "operation_type", nullable = false, length = 100)
  private String operationType;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 32)
  private IdempotencyStatus status;

  @Column(name = "response_code")
  private Integer responseCode;

  @Column(name = "response_body", columnDefinition = "TEXT")
  private String responseBody;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  protected IdempotencyRecordEntity() {}

  public IdempotencyRecordEntity(
      UUID id,
      UUID userId,
      String idempotencyKey,
      String operationType,
      IdempotencyStatus status,
      Integer responseCode,
      String responseBody,
      Instant createdAt,
      Instant expiresAt) {
    this.id = id;
    this.userId = userId;
    this.idempotencyKey = idempotencyKey;
    this.operationType = operationType;
    this.status = status;
    this.responseCode = responseCode;
    this.responseBody = responseBody;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
  }

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public String getOperationType() {
    return operationType;
  }

  public IdempotencyStatus getStatus() {
    return status;
  }

  public Integer getResponseCode() {
    return responseCode;
  }

  public String getResponseBody() {
    return responseBody;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setStatus(IdempotencyStatus status) {
    this.status = status;
  }

  public void setResponseCode(Integer responseCode) {
    this.responseCode = responseCode;
  }

  public void setResponseBody(String responseBody) {
    this.responseBody = responseBody;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }

  public IdempotencyRecord toDomain() {
    return new IdempotencyRecord(
        id,
        userId,
        idempotencyKey,
        operationType,
        status,
        Optional.ofNullable(responseCode),
        Optional.ofNullable(responseBody),
        createdAt,
        expiresAt);
  }

  public static IdempotencyRecordEntity fromDomain(IdempotencyRecord domain) {
    return new IdempotencyRecordEntity(
        domain.id(),
        domain.userId(),
        domain.idempotencyKey(),
        domain.operationType(),
        domain.status(),
        domain.responseCode().orElse(null),
        domain.responseBody().orElse(null),
        domain.createdAt(),
        domain.expiresAt());
  }
}
