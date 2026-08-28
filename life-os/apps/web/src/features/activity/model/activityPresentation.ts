import {
  Archive,
  CheckCircle2,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import type { ActivityEvent } from "@components/navigation";

import type { ActivityEventDto, ActivityEventType } from "../api/activityApi";

export type ActivityTypeFilter = "ALL" | "PROJECT" | "TASK" | "SUBTASK" | "COMMENT";

export const ACTIVITY_TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "All activity" },
  { value: "PROJECT", label: "Project changes" },
  { value: "TASK", label: "Task changes" },
  { value: "SUBTASK", label: "Subtask changes" },
  { value: "COMMENT", label: "Comment changes" },
] as const;

interface ActivityPresentation {
  readonly action: string;
  readonly icon: LucideIcon;
  readonly filter: Exclude<ActivityTypeFilter, "ALL">;
}

const ACTIVITY_PRESENTATION: Record<ActivityEventType, ActivityPresentation> = {
  PROJECT_CREATED: { action: "created", icon: Plus, filter: "PROJECT" },
  PROJECT_UPDATED: { action: "updated", icon: Pencil, filter: "PROJECT" },
  PROJECT_ARCHIVED: { action: "archived", icon: Archive, filter: "PROJECT" },
  PROJECT_RESTORED: { action: "restored", icon: RotateCcw, filter: "PROJECT" },
  PROJECT_DELETED: { action: "deleted", icon: Trash2, filter: "PROJECT" },
  TASK_CREATED: { action: "created", icon: Plus, filter: "TASK" },
  TASK_UPDATED: { action: "updated", icon: Pencil, filter: "TASK" },
  TASK_STATUS_CHANGED: { action: "changed the status of", icon: Pencil, filter: "TASK" },
  TASK_ARCHIVED: { action: "archived", icon: Archive, filter: "TASK" },
  TASK_RESTORED: { action: "restored", icon: RotateCcw, filter: "TASK" },
  TASK_DELETED: { action: "deleted", icon: Trash2, filter: "TASK" },
  SUBTASK_CREATED: { action: "added a Subtask to", icon: Plus, filter: "SUBTASK" },
  SUBTASK_UPDATED: { action: "updated a Subtask in", icon: Pencil, filter: "SUBTASK" },
  SUBTASK_COMPLETED: {
    action: "marked a Subtask done in",
    icon: CheckCircle2,
    filter: "SUBTASK",
  },
  SUBTASK_DELETED: { action: "deleted a Subtask from", icon: Trash2, filter: "SUBTASK" },
  COMMENT_CREATED: { action: "commented on", icon: MessageSquare, filter: "COMMENT" },
  COMMENT_UPDATED: { action: "edited a comment on", icon: MessageSquare, filter: "COMMENT" },
  COMMENT_DELETED: { action: "deleted a comment from", icon: Trash2, filter: "COMMENT" },
};

export function activityMatchesFilter(
  event: ActivityEventDto,
  filter: ActivityTypeFilter,
): boolean {
  return filter === "ALL" || ACTIVITY_PRESENTATION[event.eventType].filter === filter;
}

export function mapActivityEvent(event: ActivityEventDto, actorName: string): ActivityEvent {
  const presentation = ACTIVITY_PRESENTATION[event.eventType];
  return {
    id: event.id,
    actorName,
    action: presentation.action,
    ...(event.object ? { object: { label: event.object.label, href: event.object.href } } : {}),
    createdAt: event.occurredAt,
    icon: presentation.icon,
  };
}

export function activityFilterEmptyTitle(filter: ActivityTypeFilter): string {
  const label = ACTIVITY_TYPE_FILTER_OPTIONS.find((option) => option.value === filter)?.label;
  return filter === "ALL"
    ? "No activity yet"
    : `No ${label?.toLowerCase() ?? "matching"} on this page`;
}
