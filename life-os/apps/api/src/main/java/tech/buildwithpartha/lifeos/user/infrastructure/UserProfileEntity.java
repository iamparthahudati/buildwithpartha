package tech.buildwithpartha.lifeos.user.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/** JPA entity mapping profile and localization fields on {@code public.users}. */
@Entity
@Table(name = "users", schema = "public")
class UserProfileEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "email", nullable = false, updatable = false)
  private String email;

  @Column(name = "display_name", nullable = false)
  private String displayName;

  @Column(name = "time_zone", nullable = false)
  private String timeZone;

  @Column(name = "locale", nullable = false)
  private String locale;

  @Column(name = "week_start", nullable = false)
  private short weekStart;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected UserProfileEntity() {}

  UserProfileEntity(
      UUID id,
      String email,
      String displayName,
      String timeZone,
      String locale,
      short weekStart,
      Instant updatedAt,
      long version) {
    this.id = id;
    this.email = email;
    this.displayName = displayName;
    this.timeZone = timeZone;
    this.locale = locale;
    this.weekStart = weekStart;
    this.updatedAt = updatedAt;
    this.version = version;
  }

  UUID getId() {
    return id;
  }

  String getEmail() {
    return email;
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

  Instant getUpdatedAt() {
    return updatedAt;
  }

  long getVersion() {
    return version;
  }
}
