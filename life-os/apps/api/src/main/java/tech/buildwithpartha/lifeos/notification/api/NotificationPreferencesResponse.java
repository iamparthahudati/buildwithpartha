package tech.buildwithpartha.lifeos.notification.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.notification.domain.NotificationPreferences;

/** REST response DTO for notification preferences (LOS-1303). */
public record NotificationPreferencesResponse(
    UUID id,
    UUID userId,
    boolean quietHoursEnabled,
    String quietHoursStart,
    String quietHoursEnd,
    boolean dueRemindersEnabled,
    boolean overdueRemindersEnabled,
    boolean timeBlockRemindersEnabled,
    boolean focusRemindersEnabled,
    boolean habitRemindersEnabled,
    boolean reviewPromptsEnabled,
    boolean securityNoticesEnabled,
    boolean systemNoticesEnabled,
    boolean inAppChannelEnabled,
    boolean emailChannelEnabled,
    boolean pushChannelEnabled,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static NotificationPreferencesResponse fromDomain(NotificationPreferences preferences) {
    return new NotificationPreferencesResponse(
        preferences.id(),
        preferences.userId(),
        preferences.quietHoursEnabled(),
        preferences.quietHoursStart(),
        preferences.quietHoursEnd(),
        preferences.dueRemindersEnabled(),
        preferences.overdueRemindersEnabled(),
        preferences.timeBlockRemindersEnabled(),
        preferences.focusRemindersEnabled(),
        preferences.habitRemindersEnabled(),
        preferences.reviewPromptsEnabled(),
        preferences.securityNoticesEnabled(),
        preferences.systemNoticesEnabled(),
        preferences.inAppChannelEnabled(),
        preferences.emailChannelEnabled(),
        preferences.pushChannelEnabled(),
        preferences.createdAt(),
        preferences.updatedAt(),
        preferences.version());
  }
}
