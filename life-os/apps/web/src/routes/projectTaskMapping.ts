import type { ProjectOverviewTask } from "@features/projects";
import type { TaskRecord, TaskStatus } from "@features/tasks";

type ProjectOverviewTaskStatus = ProjectOverviewTask["status"];

const TASK_STATUS_TO_OVERVIEW: Readonly<Record<TaskStatus, ProjectOverviewTaskStatus>> = {
  TO_DO: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  BLOCKED: "BLOCKED",
  DONE: "COMPLETED",
  CANCELLED: "PLANNED",
};

function dueAtToLocalDate(dueAt: string, timeZone: string): string | null {
  const instant = new Date(dueAt);
  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function mapTaskRecordToProjectOverviewTask(
  task: TaskRecord,
  timeZone: string,
): ProjectOverviewTask {
  return {
    id: task.id,
    title: task.title,
    status: TASK_STATUS_TO_OVERVIEW[task.status],
    priority: task.priority,
    ...(task.dueAt ? { dueDate: dueAtToLocalDate(task.dueAt, timeZone) } : {}),
    ...(task.href ? { href: task.href } : {}),
  };
}
