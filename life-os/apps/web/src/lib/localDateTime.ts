/**
 * Canonical local date and local time values (LOS-0318, LOS-0319).
 *
 * A due date is a calendar date, not an instant. `2026-08-17` means the
 * seventeenth of August wherever the user is; it does not mean midnight UTC.
 * The moment a date-only value is put through a `Date` in the browser's local
 * zone it acquires a time of day, and every user east or west of the server
 * starts seeing the day before or after their own.
 *
 * So LifeOS carries date-only and time-only values as strings end to end —
 * `YYYY-MM-DD` and `HH:mm` — and this module is the only place allowed to turn
 * an instant into one or format one for display.
 */

/** A calendar date with no time and no zone, formatted `YYYY-MM-DD`. */
export type LocalDate = string;

/** A wall-clock time with no date and no zone, formatted `HH:mm` or `HH:mm:ss`. */
export type LocalTime = string;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function isLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) {
    return false;
  }

  // The pattern accepts 2026-02-31; round-tripping the parts rejects it.
  const { year, month, day } = splitLocalDate(value);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function isLocalTime(value: string): boolean {
  return LOCAL_TIME_PATTERN.test(value);
}

/**
 * The calendar date it currently is for someone in `timeZone`.
 *
 * This is the one supported way to answer "what is today", because the
 * browser's own clock zone is not the user's confirmed timezone.
 */
export function todayLocalDate(timeZone: string, now: Date = new Date()): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  // Assembled from named parts rather than a formatted string, so the result
  // does not depend on how a locale happens to order or punctuate a date.
  return `${partValue(parts, "year")}-${partValue(parts, "month")}-${partValue(parts, "day")}`;
}

/** The wall-clock time it currently is for someone in `timeZone`. */
export function nowLocalTime(timeZone: string, now: Date = new Date()): LocalTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  return `${partValue(parts, "hour")}:${partValue(parts, "minute")}`;
}

/**
 * Calendar arithmetic on a date-only value.
 *
 * `Date.UTC` is used purely as a calendar engine: the value goes in as UTC
 * parts and comes back out as UTC parts, so no zone conversion ever happens and
 * a day cannot be lost to a local offset. Days added this way are calendar
 * days, which is what a deadline means — a day that contains a daylight-saving
 * change is still one day.
 */
export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const { year, month, day } = splitLocalDate(date);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * MILLISECONDS_PER_DAY);

  return [
    String(shifted.getUTCFullYear()).padStart(4, "0"),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** Negative when `a` is earlier, positive when later, zero when the same day. */
export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  // `YYYY-MM-DD` sorts correctly as text, so no parsing is needed.
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Formats a date-only value for display.
 *
 * The formatter is pinned to UTC because the value was placed into UTC parts
 * with no zone attached; letting it fall back to the browser zone is exactly
 * the off-by-one-day bug this module exists to prevent.
 */
export function formatLocalDate(
  date: LocalDate,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const { year, month, day } = splitLocalDate(date);

  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** Minutes since midnight, for range checks and duration maths. */
export function localTimeToMinutes(time: LocalTime): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * MINUTES_PER_HOUR + Number(minutes);
}

/** The canonical `HH:mm` for a number of minutes since midnight. */
export function localTimeFromMinutes(minutes: number): LocalTime {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

  return [
    String(Math.floor(wrapped / MINUTES_PER_HOUR)).padStart(2, "0"),
    String(wrapped % MINUTES_PER_HOUR).padStart(2, "0"),
  ].join(":");
}

function splitLocalDate(date: LocalDate): { year: number; month: number; day: number } {
  const [year = "0", month = "1", day = "1"] = date.split("-");
  return { year: Number(year), month: Number(month), day: Number(day) };
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}
