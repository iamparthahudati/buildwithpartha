import type { LocalTime } from "@lib/localDateTime";

/** Derived placement of a Time Block within the Today schedule. */
export type TodayScheduleBlockState = "current" | "next" | "upcoming" | "completed";

export interface TodayScheduleProjectContext {
  readonly id: string;
  readonly name: string;
  readonly href: string;
}

/**
 * Presentation model for one canonical Time Block in Today's schedule.
 *
 * `state` and `conflictDescriptions` are projections supplied by the Today
 * query mapper. The component does not infer them from the browser clock,
 * which may differ from the Account's confirmed timezone or server state.
 */
export interface TodayScheduleBlock {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
  readonly state: TodayScheduleBlockState;
  readonly category?: string;
  readonly project?: TodayScheduleProjectContext;
  readonly conflictDescriptions?: readonly string[];
}

export type TodayScheduleState =
  | { readonly type: "loading" }
  | { readonly type: "empty" }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "ready"; readonly blocks: readonly TodayScheduleBlock[] };

/** Formats a wall-clock value without attaching the browser's timezone. */
export function formatTodayScheduleTime(time: LocalTime, locale: string): string {
  const [hour = "0", minute = "0"] = time.split(":");
  const instant = new Date(Date.UTC(2000, 0, 1, Number(hour), Number(minute)));

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(instant);
}
