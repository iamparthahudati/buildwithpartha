package tech.buildwithpartha.lifeos.notification.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Request DTO for updating notification preferences (LOS-1303). */
public record UpdateNotificationPreferencesRequest(
    boolean quietHoursEnabled,
    @NotNull @Pattern(regexp = "^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$") String quietHoursStart,
    @NotNull @Pattern(regexp = "^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$") String quietHoursEnd,
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
    boolean pushChannelEnabled) {}
