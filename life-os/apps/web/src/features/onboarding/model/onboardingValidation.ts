import { isLocalTime } from "@lib/localDateTime";

import { isValidTimezone } from "./timezones";

/**
 * Onboarding form validation (LOS-0514, 25-ONBOARDING-SPECIFICATION.md).
 * Validates step values locally before network submission to surface immediate errors.
 */

export interface WelcomeFormValues {
  readonly displayName: string;
}

export interface WelcomeFormErrors {
  readonly displayName?: string;
}

export function validateWelcomeForm(values: WelcomeFormValues): WelcomeFormErrors {
  const errors: Record<string, string> = {};

  const trimmedName = values.displayName.trim();
  if (trimmedName.length === 0) {
    errors.displayName = "Enter your display name.";
  } else if (trimmedName.length > 100) {
    errors.displayName = "Display name must be 100 characters or fewer.";
  }

  return errors;
}

export interface TimeAndWeekFormValues {
  readonly timeZone: string;
  readonly locale: string;
  readonly weekStart: number;
}

export interface TimeAndWeekFormErrors {
  readonly timeZone?: string;
  readonly locale?: string;
  readonly weekStart?: string;
}

export function validateTimeAndWeekForm(values: TimeAndWeekFormValues): TimeAndWeekFormErrors {
  const errors: Record<string, string> = {};

  const trimmedTz = values.timeZone.trim();
  if (trimmedTz.length === 0) {
    errors.timeZone = "Select a timezone.";
  } else if (!isValidTimezone(trimmedTz)) {
    errors.timeZone = "Select a valid IANA timezone or UTC.";
  }

  if (![1, 6, 7].includes(values.weekStart)) {
    errors.weekStart = "Week start must be Monday, Saturday, or Sunday.";
  }

  return errors;
}

export interface PlanningDefaultsFormValues {
  readonly workingDays: readonly number[];
  readonly workStartTime: string;
  readonly workEndTime: string;
  readonly overnightSchedule: boolean;
  readonly dailyFocusTargetMinutes: number | "";
  readonly focusDurationMinutes: number | "";
  readonly breakDurationMinutes: number | "";
}

export interface PlanningDefaultsFormErrors {
  readonly workingDays?: string;
  readonly workStartTime?: string;
  readonly workEndTime?: string;
  readonly dailyFocusTargetMinutes?: string;
  readonly focusDurationMinutes?: string;
  readonly breakDurationMinutes?: string;
}

export function validatePlanningDefaultsForm(
  values: PlanningDefaultsFormValues,
): PlanningDefaultsFormErrors {
  const errors: Record<string, string> = {};

  if (values.workingDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    errors.workingDays = "Working days must be days from Monday (1) to Sunday (7).";
  }

  const validStart = values.workStartTime.trim() === "" || isLocalTime(values.workStartTime);
  const validEnd = values.workEndTime.trim() === "" || isLocalTime(values.workEndTime);

  if (!validStart) {
    errors.workStartTime = "Start time must be formatted as HH:mm.";
  }

  if (!validEnd) {
    errors.workEndTime = "End time must be formatted as HH:mm.";
  }

  if (
    validStart &&
    validEnd &&
    values.workStartTime.trim() !== "" &&
    values.workEndTime.trim() !== "" &&
    !values.overnightSchedule &&
    values.workStartTime >= values.workEndTime
  ) {
    errors.workEndTime = "End time must be later than start time, or enable overnight schedule.";
  }

  if (values.dailyFocusTargetMinutes !== "") {
    const target = Number(values.dailyFocusTargetMinutes);
    if (!Number.isInteger(target) || target < 1 || target > 1440) {
      errors.dailyFocusTargetMinutes =
        "Daily focus target must be between 1 and 1,440 minutes (24 hours).";
    }
  }

  if (values.focusDurationMinutes === "") {
    errors.focusDurationMinutes = "Enter a focus duration.";
  } else {
    const focus = Number(values.focusDurationMinutes);
    if (!Number.isInteger(focus) || focus < 1 || focus > 720) {
      errors.focusDurationMinutes = "Focus duration must be between 1 and 720 minutes.";
    }
  }

  if (values.breakDurationMinutes === "") {
    errors.breakDurationMinutes = "Enter a break duration.";
  } else {
    const breakMin = Number(values.breakDurationMinutes);
    if (!Number.isInteger(breakMin) || breakMin < 1 || breakMin > 180) {
      errors.breakDurationMinutes = "Break duration must be between 1 and 180 minutes.";
    }
  }

  return errors;
}
