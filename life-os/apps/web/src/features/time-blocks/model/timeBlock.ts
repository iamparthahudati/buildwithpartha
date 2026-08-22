import type { LocalDate, LocalTime } from "@lib/localDateTime";
import { formatDurationMinutes } from "@lib/duration";

export type TimeBlockStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface TimeBlockCategoryInfo {
  readonly name: string;
  readonly color?: string | null;
  readonly icon?: string | null;
}

export interface TimeBlockProjectContext {
  readonly id: string;
  readonly name: string;
  readonly href?: string;
}

export interface TimeBlockTaskContext {
  readonly id: string;
  readonly title: string;
  readonly href?: string;
}

export interface TimeBlock {
  readonly id: string;
  readonly title: string;
  readonly category?: string | TimeBlockCategoryInfo | null;
  readonly categoryColor?: string | null;
  readonly categoryIcon?: string | null;
  readonly date?: LocalDate;
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
  readonly timeZone?: string;
  readonly status: TimeBlockStatus;
  readonly completed?: boolean;
  readonly hasConflict?: boolean;
  readonly conflictDescriptions?: readonly string[];
  readonly isCurrent?: boolean;
  readonly project?: TimeBlockProjectContext | null;
  readonly projectId?: string | null;
  readonly projectName?: string | null;
  readonly task?: TimeBlockTaskContext | null;
  readonly taskId?: string | null;
  readonly taskTitle?: string | null;
  readonly notes?: string | null;
  readonly href?: string;
}

function timeToMinutes(time: LocalTime): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function timeBlockDurationMinutes(startTime: LocalTime, endTime: LocalTime): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const diff = end - start;
  return diff >= 0 ? diff : diff + 1440;
}

export function formatTimeBlockDuration(
  startTime: LocalTime,
  endTime: LocalTime,
  locale: string = "en-US",
): string {
  const minutes = timeBlockDurationMinutes(startTime, endTime);
  return formatDurationMinutes(minutes, locale, "compact");
}

export function formatTimeBlockRange(
  startTime: LocalTime,
  endTime: LocalTime,
  locale: string = "en-US",
): string {
  const formatTime = (time: LocalTime) => {
    const [hour = "0", minute = "0"] = time.split(":");
    const date = new Date(Date.UTC(2000, 0, 1, Number(hour), Number(minute)));
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(date);
  };

  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}
