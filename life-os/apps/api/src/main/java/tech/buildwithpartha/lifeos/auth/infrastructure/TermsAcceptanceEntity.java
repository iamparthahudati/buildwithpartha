package tech.buildwithpartha.lifeos.auth.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA row for {@code public.terms_acceptances} ({@code V2__identity_schema.sql}). Translated to and
 * from the immutable {@code auth.domain.TermsAcceptance} aggregate by {@link
 * JpaTermsAcceptanceRepository}.
 */
@Entity
@Table(name = "terms_acceptances", schema = "public")
class TermsAcceptanceEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private UUID userId;

  @Column(name = "terms_version", nullable = false, updatable = false)
  private String termsVersion;

  @Column(name = "accepted_at", nullable = false, updatable = false)
  private Instant acceptedAt;

  @Column(name = "ip_source", updatable = false)
  private String ipSource;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected TermsAcceptanceEntity() {}

  TermsAcceptanceEntity(
      UUID id,
      UUID userId,
      String termsVersion,
      Instant acceptedAt,
      String ipSource,
      Instant createdAt) {
    this.id = id;
    this.userId = userId;
    this.termsVersion = termsVersion;
    this.acceptedAt = acceptedAt;
    this.ipSource = ipSource;
    this.createdAt = createdAt;
  }

  UUID getId() {
    return id;
  }

  UUID getUserId() {
    return userId;
  }

  String getTermsVersion() {
    return termsVersion;
  }

  Instant getAcceptedAt() {
    return acceptedAt;
  }

  String getIpSource() {
    return ipSource;
  }

  Instant getCreatedAt() {
    return createdAt;
  }
}
