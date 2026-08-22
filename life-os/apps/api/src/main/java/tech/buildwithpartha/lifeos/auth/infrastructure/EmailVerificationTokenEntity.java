package tech.buildwithpartha.lifeos.auth.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA row for {@code public.email_verification_tokens} ({@code V2__identity_schema.sql}).
 * Translated to and from the immutable {@code auth.domain.EmailVerificationToken} aggregate by
 * {@link JpaEmailVerificationTokenRepository}. LOS-0503 only inserts; LOS-0504 will add the
 * consuming update.
 */
@Entity
@Table(name = "email_verification_tokens", schema = "public")
class EmailVerificationTokenEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "token_hash", nullable = false, updatable = false)
  private String tokenHash;

  @Column(name = "expires_at", nullable = false, updatable = false)
  private Instant expiresAt;

  @Column(name = "consumed_at")
  private Instant consumedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected EmailVerificationTokenEntity() {}

  EmailVerificationTokenEntity(
      UUID id,
      UUID userId,
      String tokenHash,
      Instant expiresAt,
      Instant consumedAt,
      Instant createdAt) {
    this.id = id;
    this.userId = userId;
    this.tokenHash = tokenHash;
    this.expiresAt = expiresAt;
    this.consumedAt = consumedAt;
    this.createdAt = createdAt;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  String getTokenHash() {
    return tokenHash;
  }

  Instant getExpiresAt() {
    return expiresAt;
  }

  Instant getConsumedAt() {
    return consumedAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }
}
