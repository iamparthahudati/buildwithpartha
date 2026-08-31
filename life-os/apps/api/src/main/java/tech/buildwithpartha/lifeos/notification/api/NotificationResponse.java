package tech.buildwithpartha.lifeos.notification.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.notification.domain.Notification;
import tech.buildwithpartha.lifeos.notification.domain.NotificationCategory;

/** REST response DTO for in-app notification records (LOS-1303). */
public record NotificationResponse(
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

  public static NotificationResponse fromDomain(Notification notification) {
    return new NotificationResponse(
        notification.id(),
        notification.userId(),
        notification.category(),
        notification.title(),
        notification.body(),
        notification.targetUrl().orElse(null),
        notification.readAt().orElse(null),
        notification.isClearable(),
        notification.createdAt(),
        notification.version());
  }

  @Override
  public String toString() {
    return "NotificationResponse["
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
