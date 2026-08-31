import {
  Bell,
  AlertTriangle,
  Clock,
  Zap,
  Repeat,
  RotateCcw,
  ShieldAlert,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { BadgeTone } from "@components/ui";

export type NotificationCategory =
  "DUE_REMINDER" | "OVERDUE" | "TIME_BLOCK" | "FOCUS" | "HABIT" | "REVIEW" | "SECURITY" | "SYSTEM";

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = Object.freeze([
  "DUE_REMINDER",
  "OVERDUE",
  "TIME_BLOCK",
  "FOCUS",
  "HABIT",
  "REVIEW",
  "SECURITY",
  "SYSTEM",
]);

export interface NotificationItem {
  readonly id: string;
  readonly userId: string;
  readonly category: NotificationCategory;
  readonly title: string;
  readonly body: string;
  readonly targetUrl?: string | null;
  readonly readAt?: string | null;
  readonly isClearable: boolean;
  readonly createdAt: string;
  readonly version: number;
}

export interface NotificationPageResponse {
  readonly items: readonly NotificationItem[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface NotificationUnreadCountResponse {
  readonly count: number;
}

export interface NotificationPreferences {
  readonly id: string;
  readonly userId: string;
  readonly quietHoursEnabled: boolean;
  readonly quietHoursStart: string;
  readonly quietHoursEnd: string;
  readonly dueRemindersEnabled: boolean;
  readonly overdueRemindersEnabled: boolean;
  readonly timeBlockRemindersEnabled: boolean;
  readonly focusRemindersEnabled: boolean;
  readonly habitRemindersEnabled: boolean;
  readonly reviewPromptsEnabled: boolean;
  readonly securityNoticesEnabled: boolean;
  readonly systemNoticesEnabled: boolean;
  readonly inAppChannelEnabled: boolean;
  readonly emailChannelEnabled: boolean;
  readonly pushChannelEnabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface UpdateNotificationPreferencesRequest {
  readonly quietHoursEnabled: boolean;
  readonly quietHoursStart: string;
  readonly quietHoursEnd: string;
  readonly dueRemindersEnabled: boolean;
  readonly overdueRemindersEnabled: boolean;
  readonly timeBlockRemindersEnabled: boolean;
  readonly focusRemindersEnabled: boolean;
  readonly habitRemindersEnabled: boolean;
  readonly reviewPromptsEnabled: boolean;
  readonly securityNoticesEnabled: boolean;
  readonly systemNoticesEnabled: boolean;
  readonly inAppChannelEnabled: boolean;
  readonly emailChannelEnabled: boolean;
  readonly pushChannelEnabled: boolean;
}

export function getCategoryLabel(category: NotificationCategory): string {
  switch (category) {
    case "DUE_REMINDER":
      return "Due Reminder";
    case "OVERDUE":
      return "Overdue";
    case "TIME_BLOCK":
      return "Time Block";
    case "FOCUS":
      return "Focus";
    case "HABIT":
      return "Habit";
    case "REVIEW":
      return "Review";
    case "SECURITY":
      return "Security";
    case "SYSTEM":
      return "System";
  }
}

export function getCategoryIcon(category: NotificationCategory): LucideIcon {
  switch (category) {
    case "DUE_REMINDER":
      return Bell;
    case "OVERDUE":
      return AlertTriangle;
    case "TIME_BLOCK":
      return Clock;
    case "FOCUS":
      return Zap;
    case "HABIT":
      return Repeat;
    case "REVIEW":
      return RotateCcw;
    case "SECURITY":
      return ShieldAlert;
    case "SYSTEM":
      return Info;
  }
}

export function getCategoryBadgeTone(category: NotificationCategory): BadgeTone {
  switch (category) {
    case "OVERDUE":
      return "danger";
    case "SECURITY":
      return "warning";
    case "FOCUS":
      return "primary";
    case "DUE_REMINDER":
      return "info";
    case "TIME_BLOCK":
      return "neutral";
    case "HABIT":
      return "success";
    case "REVIEW":
      return "neutral";
    case "SYSTEM":
      return "neutral";
  }
}

export interface NotificationDateGroup {
  readonly title: string;
  readonly items: readonly NotificationItem[];
}

export function groupNotificationsByDate(
  items: readonly NotificationItem[],
  nowDate: Date = new Date(),
): readonly NotificationDateGroup[] {
  if (items.length === 0) return [];

  const todayStr = nowDate.toISOString().slice(0, 10);
  const yesterday = new Date(nowDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const todayItems: NotificationItem[] = [];
  const yesterdayItems: NotificationItem[] = [];
  const earlierItems: NotificationItem[] = [];

  for (const item of items) {
    const itemDateStr = item.createdAt.slice(0, 10);
    if (itemDateStr === todayStr) {
      todayItems.push(item);
    } else if (itemDateStr === yesterdayStr) {
      yesterdayItems.push(item);
    } else {
      earlierItems.push(item);
    }
  }

  const groups: NotificationDateGroup[] = [];
  if (todayItems.length > 0) {
    groups.push({ title: "Today", items: todayItems });
  }
  if (yesterdayItems.length > 0) {
    groups.push({ title: "Yesterday", items: yesterdayItems });
  }
  if (earlierItems.length > 0) {
    groups.push({ title: "Earlier", items: earlierItems });
  }

  return groups;
}
