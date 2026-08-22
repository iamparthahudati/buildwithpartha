package tech.buildwithpartha.lifeos.auth.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.domain.AccountStatus;

/**
 * JPA row for {@code public.users} ({@code V2__identity_schema.sql}). {@code version} maps to JPA's
 * own {@link Version} field so Hibernate manages the DB's optimistic-lock counter directly; this
 * ticket only inserts, but the mapping is correct for the updates later tickets add. Translated to
 * and from the immutable {@code auth.domain.User} aggregate by {@link JpaUserRepository}.
 */
@Entity
@Table(name = "users", schema = "public")
class UserEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "email", nullable = false, updatable = false)
  private String email;

  @Column(name = "email_normalized", nullable = false, updatable = false)
  private String emailNormalized;

  @Column(name = "display_name", nullable = false)
  private String displayName;

  @Column(name = "time_zone", nullable = false)
  private String timeZone;

  @Column(name = "locale", nullable = false)
  private String locale;

  @Column(name = "week_start", nullable = false)
  private short weekStart;

  @Enumerated(EnumType.STRING)
  @Column(name = "account_status", nullable = false)
  private AccountStatus accountStatus;

  @Column(name = "verified_at")
  private Instant verifiedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected UserEntity() {}

  UserEntity(
      UUID id,
      String email,
      String emailNormalized,
      String displayName,
      String timeZone,
      String locale,
      short weekStart,
      AccountStatus accountStatus,
      Instant verifiedAt,
      Instant createdAt,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.email = email;
    this.emailNormalized = emailNormalized;
    this.displayName = displayName;
    this.timeZone = timeZone;
    this.locale = locale;
    this.weekStart = weekStart;
    this.accountStatus = accountStatus;
    this.verifiedAt = verifiedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  String getEmail() {
    return email;
  }

  String getEmailNormalized() {
    return emailNormalized;
  }

  String getDisplayName() {
    return displayName;
  }

  String getTimeZone() {
    return timeZone;
  }

  String getLocale() {
    return locale;
  }

  short getWeekStart() {
    return weekStart;
  }

  AccountStatus getAccountStatus() {
    return accountStatus;
  }

  Instant getVerifiedAt() {
    return verifiedAt;
  }

  Instant getCreatedAt() {
    return createdAt;
  }

  Instant getUpdatedAt() {
    return updatedAt;
  }

  long getVersion() {
    return version;
  }
}
