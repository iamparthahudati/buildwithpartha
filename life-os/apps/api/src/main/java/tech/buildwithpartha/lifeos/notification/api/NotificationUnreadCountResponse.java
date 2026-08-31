package tech.buildwithpartha.lifeos.notification.api;

/** REST response DTO for unread notification count (LOS-1303). */
public record NotificationUnreadCountResponse(long unreadCount) {}
