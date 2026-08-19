import type { ApiProblem } from "@lib/apiClient";
import { groupFieldProblems } from "@lib/serverErrors";

import type {
  PlanningDefaultsFormErrors,
  TimeAndWeekFormErrors,
  WelcomeFormErrors,
} from "./onboardingValidation";

/**
 * Resolves server validation problems into step-specific field errors (LOS-0514).
 */

export function resolveWelcomeFieldErrors(error: unknown): WelcomeFormErrors {
  if (!error || typeof error !== "object" || !("problem" in error)) {
    return {};
  }
  const problem = (error as { problem?: ApiProblem }).problem;
  const grouped = groupFieldProblems(problem?.errors);
  const errors: Record<string, string> = {};

  if (grouped.displayName) {
    errors.displayName = grouped.displayName;
  }

  return errors;
}

export function resolveTimeAndWeekFieldErrors(error: unknown): TimeAndWeekFormErrors {
  if (!error || typeof error !== "object" || !("problem" in error)) {
    return {};
  }
  const problem = (error as { problem?: ApiProblem }).problem;
  const grouped = groupFieldProblems(problem?.errors);
  const errors: Record<string, string> = {};

  if (grouped.timeZone) {
    errors.timeZone = grouped.timeZone;
  }
  if (grouped.weekStart) {
    errors.weekStart = grouped.weekStart;
  }
  if (grouped.locale) {
    errors.locale = grouped.locale;
  }

  return errors;
}

export function resolvePlanningDefaultsFieldErrors(error: unknown): PlanningDefaultsFormErrors {
  if (!error || typeof error !== "object" || !("problem" in error)) {
    return {};
  }
  const problem = (error as { problem?: ApiProblem }).problem;
  const grouped = groupFieldProblems(problem?.errors);
  const errors: Record<string, string> = {};

  if (grouped.workingDays) {
    errors.workingDays = grouped.workingDays;
  }
  if (grouped.workStartTime) {
    errors.workStartTime = grouped.workStartTime;
  }
  if (grouped.workEndTime) {
    errors.workEndTime = grouped.workEndTime;
  }
  if (grouped.dailyFocusTargetMinutes) {
    errors.dailyFocusTargetMinutes = grouped.dailyFocusTargetMinutes;
  }
  if (grouped.focusDurationMinutes) {
    errors.focusDurationMinutes = grouped.focusDurationMinutes;
  }
  if (grouped.breakDurationMinutes) {
    errors.breakDurationMinutes = grouped.breakDurationMinutes;
  }

  return errors;
}
