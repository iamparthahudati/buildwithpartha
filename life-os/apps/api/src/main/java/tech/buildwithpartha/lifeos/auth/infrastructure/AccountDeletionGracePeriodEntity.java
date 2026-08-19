package tech.buildwithpartha.lifeos.auth.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.domain.AccountDeletionRequestStatus;

/**
 * JPA row for {@code public.account_deletion_requests} ({@code
 * V7__account_deletion_grace_period_schema.sql}). Translated to and from the immutable {@code
 * auth.domain.AccountDeletionGracePeriod} aggregate by {@link
 * JpaAccountDeletionGracePeriodRepository}.
 */
@Entity
@Table(name = "account_deletion_requests", schema = "public")
class AccountDeletionGracePeriodEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private AccountDeletionRequestStatus status;

  @Column(name = "cancellation_token_hash", nullable = false, updatable = false)
  private String cancellationTokenHash;

  @Column(name = "requested_at", nullable = false, updatable = false)
  private Instant requestedAt;

  @Column(name = "scheduled_purge_at", nullable = false, updatable = false)
  private Instant scheduledPurgeAt;

  @Column(name = "cancelled_at")
  private Instant cancelledAt;

  @Column(name = "purged_at")
  private Instant purgedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected AccountDeletionGracePeriodEntity() {}

  AccountDeletionGracePeriodEntity(
      UUID id,
      UUID userId,
      AccountDeletionRequestStatus status,
      String cancellationTokenHash,
      Instant requestedAt,
      Instant scheduledPurgeAt,
      Instant cancelledAt,
      Instant purgedAt,
      Instant createdAt) {
    this.id = id;
    this.userId = userId;
    this.status = status;
    this.cancellationTokenHash = cancellationTokenHash;
    this.requestedAt = requestedAt;
    this.scheduledPurgeAt = scheduledPurgeAt;
    this.cancelledAt = cancelledAt;
    this.purgedAt = purgedAt;
    this.createdAt = createdAt;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  AccountDeletionRequestStatus getStatus() {
    return status;
  }

  String getCancellationTokenHash() {
    return cancellationTokenHash;
  }

  Instant getRequestedAt() {
    return requestedAt;
  }

  Instant getScheduledPurgeAt() {
    return scheduledPurgeAt;
  }

  Instant getCancelledAt() {
    return cancelledAt;
  }

  Instant getPurgedAt() {
    return purgedAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }
}
