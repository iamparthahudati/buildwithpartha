import { addLocalDays, compareLocalDates, isLocalDate, type LocalDate } from "@lib/localDateTime";

export type RecurrenceFrequency =
  "DAILY" | "WEEKLY" | "MONTHLY" | "WEEKDAY" | "INTERVAL" | "AFTER_COMPLETION";

export type RecurrenceEndMode = "NEVER" | "UNTIL_DATE" | "COUNT";

export type RecurrenceDayOfWeek =
  "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type RecurrenceEditScope = "THIS_OCCURRENCE" | "THIS_AND_FUTURE" | "SERIES";

export interface RecurrenceRule {
  readonly frequency: RecurrenceFrequency;
  readonly intervalValue: number;
  readonly daysOfWeek?: readonly RecurrenceDayOfWeek[];
  readonly dayOfMonth?: number;
  readonly endMode: RecurrenceEndMode;
  readonly endDate?: LocalDate | null;
  readonly endCount?: number | null;
  readonly startDate: LocalDate;
  readonly timeZone: string;
}

export const DAY_OF_WEEK_LABELS: Record<
  RecurrenceDayOfWeek,
  { short: string; full: string; jsDay: number }
> = {
  MONDAY: { short: "Mon", full: "Monday", jsDay: 1 },
  TUESDAY: { short: "Tue", full: "Tuesday", jsDay: 2 },
  WEDNESDAY: { short: "Wed", full: "Wednesday", jsDay: 3 },
  THURSDAY: { short: "Thu", full: "Thursday", jsDay: 4 },
  FRIDAY: { short: "Fri", full: "Friday", jsDay: 5 },
  SATURDAY: { short: "Sat", full: "Saturday", jsDay: 6 },
  SUNDAY: { short: "Sun", full: "Sunday", jsDay: 0 },
};

export const ALL_DAYS_OF_WEEK: readonly RecurrenceDayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface RecurrenceValidationResult {
  readonly valid: boolean;
  readonly errors: Record<string, string>;
}

export function validateRecurrenceRule(rule: RecurrenceRule): RecurrenceValidationResult {
  const errors: Record<string, string> = {};

  if (!rule.startDate || !isLocalDate(rule.startDate)) {
    errors.startDate = "Start date must be a valid date (YYYY-MM-DD).";
  }

  if (!rule.intervalValue || rule.intervalValue < 1 || !Number.isInteger(rule.intervalValue)) {
    errors.intervalValue = "Interval must be an integer of 1 or greater.";
  }

  if (rule.frequency === "WEEKLY") {
    if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
      errors.daysOfWeek = "At least one day of the week must be selected for weekly recurrence.";
    }
  }

  if (rule.frequency === "MONTHLY") {
    if (
      rule.dayOfMonth === undefined ||
      rule.dayOfMonth === null ||
      rule.dayOfMonth < 1 ||
      rule.dayOfMonth > 31
    ) {
      errors.dayOfMonth = "Day of month must be between 1 and 31.";
    }
  }

  if (rule.endMode === "UNTIL_DATE") {
    if (!rule.endDate || !isLocalDate(rule.endDate)) {
      errors.endDate = "End date is required when ending on a specific date.";
    } else if (rule.startDate && compareLocalDates(rule.endDate, rule.startDate) < 0) {
      errors.endDate = "End date cannot be earlier than start date.";
    }
  }

  if (rule.endMode === "COUNT") {
    if (!rule.endCount || rule.endCount < 1 || !Number.isInteger(rule.endCount)) {
      errors.endCount = "End count must be an integer of 1 or greater.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatRecurrenceRuleSummary(rule: RecurrenceRule): string {
  const validation = validateRecurrenceRule(rule);
  if (!validation.valid) {
    return "Invalid recurrence configuration";
  }

  const interval = rule.intervalValue || 1;
  let frequencyText = "";

  switch (rule.frequency) {
    case "DAILY":
      frequencyText = interval === 1 ? "Repeats daily" : `Repeats every ${interval} days`;
      break;

    case "INTERVAL":
      frequencyText = interval === 1 ? "Repeats daily" : `Repeats every ${interval} days`;
      break;

    case "WEEKDAY":
      frequencyText =
        interval === 1
          ? "Repeats every weekday (Mon–Fri)"
          : `Repeats every ${interval} weekday cycles`;
      break;

    case "WEEKLY": {
      const base = interval === 1 ? "Repeats weekly" : `Repeats every ${interval} weeks`;
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const sortedDays = ALL_DAYS_OF_WEEK.filter((d) => rule.daysOfWeek?.includes(d));
        const dayNames = sortedDays.map((d) => DAY_OF_WEEK_LABELS[d].short).join(", ");
        frequencyText = `${base} on ${dayNames}`;
      } else {
        frequencyText = base;
      }
      break;
    }

    case "MONTHLY": {
      const base = interval === 1 ? "Repeats monthly" : `Repeats every ${interval} months`;
      if (rule.dayOfMonth) {
        frequencyText = `${base} on day ${rule.dayOfMonth}`;
      } else {
        frequencyText = base;
      }
      break;
    }

    case "AFTER_COMPLETION":
      frequencyText = `Repeats ${interval} ${interval === 1 ? "day" : "days"} after completion`;
      break;
  }

  let endText = "";
  if (rule.endMode === "UNTIL_DATE" && rule.endDate) {
    endText = `, until ${rule.endDate}`;
  } else if (rule.endMode === "COUNT" && rule.endCount) {
    endText = `, for ${rule.endCount} ${rule.endCount === 1 ? "occurrence" : "occurrences"}`;
  }

  return `${frequencyText}${endText}`;
}

export function calculateNextOccurrences(rule: RecurrenceRule, maxCount: number = 5): LocalDate[] {
  const validation = validateRecurrenceRule(rule);
  if (!validation.valid || maxCount <= 0) {
    return [];
  }

  const occurrences: LocalDate[] = [];
  const start = rule.startDate;
  const interval = rule.intervalValue || 1;

  if (rule.frequency === "DAILY" || rule.frequency === "INTERVAL") {
    let curr = start;
    while (occurrences.length < maxCount) {
      if (
        rule.endMode === "UNTIL_DATE" &&
        rule.endDate &&
        compareLocalDates(curr, rule.endDate) > 0
      ) {
        break;
      }
      if (rule.endMode === "COUNT" && rule.endCount && occurrences.length >= rule.endCount) {
        break;
      }
      occurrences.push(curr);
      curr = addLocalDays(curr, interval);
    }
  } else if (rule.frequency === "WEEKDAY") {
    let curr = start;
    while (occurrences.length < maxCount) {
      if (
        rule.endMode === "UNTIL_DATE" &&
        rule.endDate &&
        compareLocalDates(curr, rule.endDate) > 0
      ) {
        break;
      }
      if (rule.endMode === "COUNT" && rule.endCount && occurrences.length >= rule.endCount) {
        break;
      }

      const jsDay = getJsDayOfWeek(curr);
      if (jsDay !== 0 && jsDay !== 6) {
        // Monday..Friday
        occurrences.push(curr);
      }
      curr = addLocalDays(curr, 1);
    }
  } else if (rule.frequency === "WEEKLY") {
    const selectedDays =
      rule.daysOfWeek && rule.daysOfWeek.length > 0
        ? rule.daysOfWeek
        : [getRecurrenceDayFromDate(start)];
    const targetJsDays = new Set(selectedDays.map((d) => DAY_OF_WEEK_LABELS[d].jsDay));

    let weekStart = getMondayOfWeek(start);
    let done = false;

    while (!done && occurrences.length < maxCount) {
      for (let i = 0; i < 7; i++) {
        const candidate = addLocalDays(weekStart, i);
        if (compareLocalDates(candidate, start) < 0) {
          continue;
        }
        if (
          rule.endMode === "UNTIL_DATE" &&
          rule.endDate &&
          compareLocalDates(candidate, rule.endDate) > 0
        ) {
          done = true;
          break;
        }
        if (rule.endMode === "COUNT" && rule.endCount && occurrences.length >= rule.endCount) {
          done = true;
          break;
        }

        const candidateJsDay = getJsDayOfWeek(candidate);
        if (targetJsDays.has(candidateJsDay)) {
          occurrences.push(candidate);
          if (occurrences.length >= maxCount) {
            done = true;
            break;
          }
        }
      }
      weekStart = addLocalDays(weekStart, interval * 7);
    }
  } else if (rule.frequency === "MONTHLY") {
    const targetDay = rule.dayOfMonth ?? getDayOfMonthFromDate(start);
    let [year, month] = splitYearMonth(start);

    while (occurrences.length < maxCount) {
      const lastDayInMonth = daysInMonth(year, month);
      const actualDay = Math.min(targetDay, lastDayInMonth);
      const candidate = formatYearMonthDay(year, month, actualDay);

      if (compareLocalDates(candidate, start) >= 0) {
        if (
          rule.endMode === "UNTIL_DATE" &&
          rule.endDate &&
          compareLocalDates(candidate, rule.endDate) > 0
        ) {
          break;
        }
        if (rule.endMode === "COUNT" && rule.endCount && occurrences.length >= rule.endCount) {
          break;
        }
        occurrences.push(candidate);
      }

      // Step by interval months
      month += interval;
      while (month > 12) {
        month -= 12;
        year += 1;
      }
    }
  } else if (rule.frequency === "AFTER_COMPLETION") {
    // Initial occurrence is startDate
    if (
      rule.endMode === "UNTIL_DATE" &&
      rule.endDate &&
      compareLocalDates(start, rule.endDate) > 0
    ) {
      return [];
    }
    occurrences.push(start);
  }

  return occurrences;
}

function getJsDayOfWeek(date: LocalDate): number {
  const [yearStr = "2026", monthStr = "01", dayStr = "01"] = date.split("-");
  const d = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
  return d.getUTCDay();
}

function getRecurrenceDayFromDate(date: LocalDate): RecurrenceDayOfWeek {
  const jsDay = getJsDayOfWeek(date);
  const entry = Object.entries(DAY_OF_WEEK_LABELS).find(([_, info]) => info.jsDay === jsDay);
  return (entry?.[0] as RecurrenceDayOfWeek) ?? "MONDAY";
}

function getMondayOfWeek(date: LocalDate): LocalDate {
  const jsDay = getJsDayOfWeek(date);
  // ISO week starts on Monday (1). Sunday is 0 -> shift 6 days back.
  const daysFromMonday = jsDay === 0 ? 6 : jsDay - 1;
  return addLocalDays(date, -daysFromMonday);
}

function getDayOfMonthFromDate(date: LocalDate): number {
  const parts = date.split("-");
  return Number(parts[2] ?? 1);
}

function splitYearMonth(date: LocalDate): [number, number] {
  const parts = date.split("-");
  return [Number(parts[0] ?? 2026), Number(parts[1] ?? 1)];
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatYearMonthDay(year: number, month: number, day: number): LocalDate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
