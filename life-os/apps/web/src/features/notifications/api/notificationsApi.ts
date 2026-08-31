import { apiRequest } from "@lib/apiClient";
import type {
  NotificationItem,
  NotificationPageResponse,
  NotificationUnreadCountResponse,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
} from "../model/notifications";

export interface FetchNotificationsParams {
  readonly unreadOnly?: boolean;
  readonly categories?: readonly string[];
  readonly category?: string;
  readonly page?: number;
  readonly size?: number;
}

export async function fetchNotifications(
  params: FetchNotificationsParams = {},
  signal?: AbortSignal,
): Promise<NotificationPageResponse> {
  const searchParams = new URLSearchParams();
  if (params.unreadOnly !== undefined) {
    searchParams.set("unreadOnly", String(params.unreadOnly));
  }
  if (params.categories && params.categories.length > 0) {
    searchParams.set("categories", params.categories.join(","));
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }
  if (params.size !== undefined) {
    searchParams.set("size", String(params.size));
  }

  const queryString = searchParams.toString();
  const path = `/notifications${queryString ? `?${queryString}` : ""}`;
  return apiRequest<NotificationPageResponse>(path, { ...(signal ? { signal } : {}) });
}

export async function fetchUnreadCount(
  signal?: AbortSignal,
): Promise<NotificationUnreadCountResponse> {
  return apiRequest<NotificationUnreadCountResponse>("/notifications/unread-count", {
    ...(signal ? { signal } : {}),
  });
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  return apiRequest<NotificationItem>(`/notifications/${id}/read`, { method: "PUT" });
}

export async function markNotificationUnread(id: string): Promise<NotificationItem> {
  return apiRequest<NotificationItem>(`/notifications/${id}/unread`, { method: "PUT" });
}

export async function markAllNotificationsRead(): Promise<void> {
  return apiRequest<void>("/notifications/read-all", { method: "PUT" });
}

export async function clearNotification(id: string): Promise<void> {
  return apiRequest<void>(`/notifications/${id}`, { method: "DELETE" });
}

export async function clearAllNotifications(): Promise<void> {
  return apiRequest<void>("/notifications", { method: "DELETE" });
}

export async function fetchNotificationPreferences(
  signal?: AbortSignal,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/notifications/preferences", {
    ...(signal ? { signal } : {}),
  });
}

export async function updateNotificationPreferences(
  request: UpdateNotificationPreferencesRequest,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/notifications/preferences", {
    method: "PUT",
    body: request,
  });
}
