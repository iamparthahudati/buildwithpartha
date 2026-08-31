package tech.buildwithpartha.lifeos.notification.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain aggregate root representing an in-app notification (LOS-1303). Redacts title and body text
 * in toString() to guarantee private notification contents are never logged.
 */
public record Notification(
    UUID id,
    UUID userId,
    NotificationCategory category,
    String title,
    String body,
    Optional<String> targetUrl,
    Optional<Instant> readAt,
    boolean isClearable,
    Instant createdAt,
    long version) {

  public Notification {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(category, "category must not be null");
    Objects.requireNonNull(title, "title must not be null");
    if (title.isBlank()) {
      throw new IllegalArgumentException("title must not be blank");
    }
    Objects.requireNonNull(body, "body must not be null");
    if (body.isBlank()) {
      throw new IllegalArgumentException("body must not be blank");
    }
    Objects.requireNonNull(targetUrl, "targetUrl must not be null");
    Objects.requireNonNull(readAt, "readAt must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
  }

  public static Notification create(
      UUID userId,
      NotificationCategory category,
      String title,
      String body,
      String targetUrl,
      boolean isClearable,
      Instant createdAt) {
    return new Notification(
        UUID.randomUUID(),
        userId,
        category,
        title,
        body,
        Optional.ofNullable(targetUrl),
        Optional.empty(),
        category == NotificationCategory.SECURITY ? false : isClearable,
        createdAt,
        0L);
  }

  public boolean isRead() {
    return readAt.isPresent();
  }

  public Notification markRead(Instant now) {
    if (readAt.isPresent()) {
      return this;
    }
    return new Notification(
        id,
        userId,
        category,
        title,
        body,
        targetUrl,
        Optional.of(now),
        isClearable,
        createdAt,
        version);
  }

  public Notification markUnread() {
    if (readAt.isEmpty()) {
      return this;
    }
    return new Notification(
        id,
        userId,
        category,
        title,
        body,
        targetUrl,
        Optional.empty(),
        isClearable,
        createdAt,
        version);
  }

  @Override
  public String toString() {
    return "Notification["
        + "id="
        + id
        + ", userId="
        + userId
        + ", category="
        + category
        + ", title=[REDACTED]"
        + ", body=[REDACTED]"
        + ", targetUrl="
        + targetUrl
        + ", readAt="
        + readAt
        + ", isClearable="
        + isClearable
        + ", createdAt="
        + createdAt
        + ", version="
        + version
        + ']';
  }
}
