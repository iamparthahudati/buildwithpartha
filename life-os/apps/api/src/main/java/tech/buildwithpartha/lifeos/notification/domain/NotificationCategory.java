package tech.buildwithpartha.lifeos.notification.domain;

import java.util.Arrays;

/** Approved notification categories for LifeOS (LOS-1303). */
public enum NotificationCategory {
  DUE_REMINDER,
  OVERDUE,
  TIME_BLOCK,
  FOCUS,
  HABIT,
  REVIEW,
  SECURITY,
  SYSTEM;

  public static NotificationCategory parse(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    return Arrays.stream(values())
        .filter(c -> c.name().equalsIgnoreCase(raw.trim()))
        .findFirst()
        .orElse(null);
  }
}
