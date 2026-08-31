package tech.buildwithpartha.lifeos.notification.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Domain aggregate holding user notification preferences (quiet hours, category toggles, channels)
 * (LOS-1303).
 */
public record NotificationPreferences(
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

  private static final Pattern TIME_PATTERN =
      Pattern.compile("^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$");

  public NotificationPreferences {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(quietHoursStart, "quietHoursStart must not be null");
    Objects.requireNonNull(quietHoursEnd, "quietHoursEnd must not be null");
    if (!TIME_PATTERN.matcher(quietHoursStart).matches()) {
      throw new IllegalArgumentException("quietHoursStart must be in HH:mm format");
    }
    if (!TIME_PATTERN.matcher(quietHoursEnd).matches()) {
      throw new IllegalArgumentException("quietHoursEnd must be in HH:mm format");
    }
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");
  }

  public static NotificationPreferences createDefault(UUID userId, Instant now) {
    return new NotificationPreferences(
        UUID.randomUUID(),
        userId,
        false,
        "22:00",
        "07:00",
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
        now,
        now,
        0L);
  }

  public NotificationPreferences update(
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
      Instant now) {
    return new NotificationPreferences(
        id,
        userId,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        dueRemindersEnabled,
        overdueRemindersEnabled,
        timeBlockRemindersEnabled,
        focusRemindersEnabled,
        habitRemindersEnabled,
        reviewPromptsEnabled,
        securityNoticesEnabled,
        systemNoticesEnabled,
        inAppChannelEnabled,
        emailChannelEnabled,
        pushChannelEnabled,
        createdAt,
        now,
        version);
  }
}
