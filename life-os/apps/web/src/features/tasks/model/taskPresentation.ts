import type { BadgeTone } from "@components/ui";

import type { TaskListItem, TaskPriority, TaskStatus } from "./task";

export const TASK_STATUS_LABEL: Readonly<Record<TaskStatus, string>> = Object.freeze({
  TO_DO: "To Do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
});

export const TASK_STATUS_BADGE_TONE: Readonly<Record<TaskStatus, BadgeTone>> = Object.freeze({
  TO_DO: "neutral",
  IN_PROGRESS: "info",
  BLOCKED: "warning",
  DONE: "success",
  CANCELLED: "neutral",
});

export const TASK_PRIORITY_LABEL: Readonly<Record<TaskPriority, string>> = Object.freeze({
  P1: "P1 — High",
  P2: "P2 — Medium",
  P3: "P3 — Low",
  P4: "P4 — Someday",
});

export const TASK_PRIORITY_BADGE_TONE: Readonly<Record<TaskPriority, BadgeTone>> = Object.freeze({
  P1: "danger",
  P2: "primary",
  P3: "neutral",
  P4: "neutral",
});

export function readTaskProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function isTaskTerminal(task: TaskListItem): boolean {
  return task.status === "DONE" || task.status === "CANCELLED";
}

export function isTaskOverdue(task: TaskListItem, now: Date): boolean {
  if (task.archivedAt || isTaskTerminal(task) || !task.dueAt) {
    return false;
  }
  if (task.overdue !== undefined) {
    return task.overdue;
  }

  const dueTime = Date.parse(task.dueAt);
  return Number.isFinite(dueTime) && dueTime < now.getTime();
}

export function formatTaskDueAt(dueAt: string, locale: string, timeZone: string): string {
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return "Due date unavailable";
  }

  return `Due ${new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dueDate)}`;
}
