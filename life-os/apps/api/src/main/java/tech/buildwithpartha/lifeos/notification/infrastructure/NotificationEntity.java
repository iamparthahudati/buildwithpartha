package tech.buildwithpartha.lifeos.notification.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;

@Entity
@Table(name = "notifications")
public class NotificationEntity {

  @Id private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "category", nullable = false)
  private NotificationCategory category;

  @Column(name = "title", nullable = false)
  private String title;

  @Column(name = "body", nullable = false)
  private String body;

  @Column(name = "target_url")
  private String targetUrl;

  @Column(name = "read_at")
  private Instant readAt;

  @Column(name = "is_clearable", nullable = false)
  private boolean isClearable;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  protected NotificationEntity() {}

  public NotificationEntity(
      UUID id,
      UUID userId,
      NotificationCategory category,
      String title,
      String body,
      String targetUrl,
      Instant readAt,
      boolean isClearable,
      Instant createdAt,
      long version) {
    this.id = id;
    this.userId = userId;
    this.category = category;
    this.title = title;
    this.body = body;
    this.targetUrl = targetUrl;
    this.readAt = readAt;
    this.isClearable = isClearable;
    this.createdAt = createdAt;
    this.version = version;
  }

  public static NotificationEntity fromDomain(Notification domain) {
    return new NotificationEntity(
        domain.id(),
        domain.userId(),
        domain.category(),
        domain.title(),
        domain.body(),
        domain.targetUrl().orElse(null),
        domain.readAt().orElse(null),
        domain.isClearable(),
        domain.createdAt(),
        domain.version());
  }

  public Notification toDomain() {
    return new Notification(
        id,
        userId,
        category,
        title,
        body,
        Optional.ofNullable(targetUrl),
        Optional.ofNullable(readAt),
        isClearable,
        createdAt,
        version);
  }

  public UUID getId() {
    return id;
  }

  public UUID getUserId() {
    return userId;
  }

  public NotificationCategory getCategory() {
    return category;
  }

  public String getTitle() {
    return title;
  }

  public String getBody() {
    return body;
  }

  public String getTargetUrl() {
    return targetUrl;
  }

  public Instant getReadAt() {
    return readAt;
  }

  public boolean isClearable() {
    return isClearable;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public long getVersion() {
    return version;
  }
}
