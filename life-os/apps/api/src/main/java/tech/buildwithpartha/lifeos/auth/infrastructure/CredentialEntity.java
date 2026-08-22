package tech.buildwithpartha.lifeos.auth.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA row for {@code public.credentials} ({@code V2__identity_schema.sql}). Translated to and from
 * the immutable {@code auth.domain.Credential} aggregate by {@link JpaCredentialRepository}.
 */
@Entity
@Table(name = "credentials", schema = "public")
class CredentialEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(name = "changed_at", nullable = false)
  private Instant changedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  protected CredentialEntity() {}

  CredentialEntity(
      UUID id,
      UUID userId,
      String passwordHash,
      Instant changedAt,
      Instant createdAt,
      Instant updatedAt) {
    this.id = id;
    this.userId = userId;
    this.passwordHash = passwordHash;
    this.changedAt = changedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  String getPasswordHash() {
    return passwordHash;
  }

  Instant getChangedAt() {
    return changedAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }
}
