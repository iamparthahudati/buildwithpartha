import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
  clearNotification,
  clearAllNotifications,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type FetchNotificationsParams,
} from "../api/notificationsApi";
import type {
  NotificationItem,
  NotificationPageResponse,
  NotificationUnreadCountResponse,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
} from "../model/notifications";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export const notificationsQueryKeys = {
  all: NOTIFICATIONS_QUERY_KEY,
  list: (params: FetchNotificationsParams) => [...NOTIFICATIONS_QUERY_KEY, "list", params] as const,
  unreadCount: [...NOTIFICATIONS_QUERY_KEY, "unreadCount"] as const,
  preferences: [...NOTIFICATIONS_QUERY_KEY, "preferences"] as const,
};

export function invalidateNotificationsQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
}

export function useNotifications(
  params: FetchNotificationsParams = {},
  enabled = true,
): UseQueryResult<NotificationPageResponse, Error> {
  return useQuery({
    queryKey: notificationsQueryKeys.list(params),
    queryFn: ({ signal }) => fetchNotifications(params, signal),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useNotificationUnreadCount(
  enabled = true,
): UseQueryResult<NotificationUnreadCountResponse, Error> {
  return useQuery({
    queryKey: notificationsQueryKeys.unreadCount,
    queryFn: ({ signal }) => fetchUnreadCount(signal),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useMarkNotificationRead(): UseMutationResult<NotificationItem, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void invalidateNotificationsQueries(queryClient);
    },
  });
}

export function useMarkNotificationUnread(): UseMutationResult<NotificationItem, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationUnread(id),
    onSuccess: () => {
      void invalidateNotificationsQueries(queryClient);
    },
  });
}

export function useMarkAllNotificationsRead(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void invalidateNotificationsQueries(queryClient);
    },
  });
}

export function useClearNotification(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clearNotification(id),
    onSuccess: () => {
      void invalidateNotificationsQueries(queryClient);
    },
  });
}

export function useClearAllNotifications(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearAllNotifications(),
    onSuccess: () => {
      void invalidateNotificationsQueries(queryClient);
    },
  });
}

export function useNotificationPreferences(
  enabled = true,
): UseQueryResult<NotificationPreferences, Error> {
  return useQuery({
    queryKey: notificationsQueryKeys.preferences,
    queryFn: ({ signal }) => fetchNotificationPreferences(signal),
    staleTime: 60_000,
    enabled,
  });
}

export function useUpdateNotificationPreferences(): UseMutationResult<
  NotificationPreferences,
  Error,
  UpdateNotificationPreferencesRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateNotificationPreferencesRequest) =>
      updateNotificationPreferences(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.preferences });
    },
  });
}
