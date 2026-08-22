package tech.buildwithpartha.lifeos.auth.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA row for {@code public.user_sessions} ({@code V2__identity_schema.sql}). Translated to and
 * from the immutable {@code auth.domain.Session} aggregate by {@link JpaSessionRepository}. {@code
 * csrf_secret} maps to the Java field {@code csrfSecretHash} — the column predates LOS-0505 and
 * keeps its original name, but it stores a hash exactly like {@code token_hash} does, never the raw
 * CSRF token.
 */
@Entity
@Table(name = "user_sessions", schema = "public")
class SessionEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "token_hash", nullable = false, updatable = false)
  private String tokenHash;

  @Column(name = "csrf_secret", nullable = false)
  private String csrfSecretHash;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "last_seen_at", nullable = false)
  private Instant lastSeenAt;

  @Column(name = "expires_at", nullable = false, updatable = false)
  private Instant expiresAt;

  @Column(name = "revoked_at")
  private Instant revokedAt;

  @Column(name = "device_hint")
  private String deviceHint;

  protected SessionEntity() {}

  SessionEntity(
      UUID id,
      UUID userId,
      String tokenHash,
      String csrfSecretHash,
      Instant createdAt,
      Instant lastSeenAt,
      Instant expiresAt,
      Instant revokedAt,
      String deviceHint) {
    this.id = id;
    this.userId = userId;
    this.tokenHash = tokenHash;
    this.csrfSecretHash = csrfSecretHash;
    this.createdAt = createdAt;
    this.lastSeenAt = lastSeenAt;
    this.expiresAt = expiresAt;
    this.revokedAt = revokedAt;
    this.deviceHint = deviceHint;
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

  String getCsrfSecretHash() {
    return csrfSecretHash;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getLastSeenAt() {
    return lastSeenAt;
  }

  Instant getExpiresAt() {
    return expiresAt;
  }

  Instant getRevokedAt() {
    return revokedAt;
  }

  String getDeviceHint() {
    return deviceHint;
  }
}
