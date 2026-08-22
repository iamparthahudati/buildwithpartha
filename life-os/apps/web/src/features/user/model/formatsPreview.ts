import { formatLocalDate, todayLocalDate } from "@lib/localDateTime";

export interface FormatsPreviewData {
  readonly todayDate: string;
  readonly currentTime: string;
  readonly shortDate: string;
  readonly relativeExample: string;
  readonly numberExample: string;
  readonly weekStartName: string;
  readonly timeZoneName: string;
}

const WEEKDAY_NAMES: readonly string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function getWeekStartName(weekStart: number): string {
  if (weekStart >= 1 && weekStart <= 7) {
    return WEEKDAY_NAMES[weekStart - 1] ?? "Monday";
  }
  return "Monday";
}

export function computeFormatsPreview(
  timeZone: string,
  locale: string,
  weekStart: number,
  now: Date = new Date(),
): FormatsPreviewData {
  const safeTimeZone = isValidIana(timeZone) ? timeZone : "UTC";
  const safeLocale = isValidLocaleString(locale) ? locale : "en-IN";

  let todayDate = "";
  let currentTime = "";
  let shortDate = "";
  let timeZoneName = safeTimeZone;

  try {
    const fullDateFormatter = new Intl.DateTimeFormat(safeLocale, {
      timeZone: safeTimeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    todayDate = fullDateFormatter.format(now);
  } catch {
    todayDate = now.toDateString();
  }

  try {
    const timeFormatter = new Intl.DateTimeFormat(safeLocale, {
      timeZone: safeTimeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
    currentTime = timeFormatter.format(now);
  } catch {
    currentTime = now.toTimeString();
  }

  try {
    const currentDate = todayLocalDate(safeTimeZone, now);
    shortDate = formatLocalDate(currentDate, safeLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    shortDate = todayLocalDate("UTC", now);
  }

  let numberExample = "1,234.50";
  try {
    numberExample = new Intl.NumberFormat(safeLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1234.5);
  } catch {
    numberExample = "1234.50";
  }

  const relativeExample = `Today, ${shortDate}`;
  const weekStartName = getWeekStartName(weekStart);

  return {
    todayDate,
    currentTime,
    shortDate,
    relativeExample,
    numberExample,
    weekStartName,
    timeZoneName,
  };
}

function isValidIana(tz: string): boolean {
  if (!tz || tz.trim() === "") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function isValidLocaleString(loc: string): boolean {
  if (!loc || loc.trim() === "") return false;
  try {
    Intl.DateTimeFormat.supportedLocalesOf([loc]);
    return true;
  } catch {
    return false;
  }
}
