import type { ApiProblem } from "@lib/apiClient";
import { groupFieldProblems } from "@lib/serverErrors";

import type { LocalizationFormErrors, ProfileFormErrors } from "./profileValidation";

export function resolveProfileFieldErrors(error: unknown): ProfileFormErrors {
  if (!error || typeof error !== "object" || !("problem" in error)) {
    return {};
  }
  const problem = (error as { problem?: ApiProblem }).problem;
  const grouped = groupFieldProblems(problem?.errors);
  const errors: Record<string, string> = {};

  if (grouped.displayName) {
    errors.displayName = mapDisplayNameProblem(grouped.displayName);
  }

  return errors;
}

export function resolveLocalizationFieldErrors(error: unknown): LocalizationFormErrors {
  if (!error || typeof error !== "object" || !("problem" in error)) {
    return {};
  }
  const problem = (error as { problem?: ApiProblem }).problem;
  const grouped = groupFieldProblems(problem?.errors);
  const errors: Record<string, string> = {};

  if (grouped.timeZone) {
    errors.timeZone = mapTimeZoneProblem(grouped.timeZone);
  }
  if (grouped.locale) {
    errors.locale = mapLocaleProblem(grouped.locale);
  }
  if (grouped.weekStart) {
    errors.weekStart = mapWeekStartProblem(grouped.weekStart);
  }

  return errors;
}

function mapDisplayNameProblem(code: string): string {
  switch (code) {
    case "NotBlank":
    case "REQUIRED":
      return "Display name is required.";
    case "Size":
    case "TOO_LONG":
      return "Display name cannot exceed 100 characters.";
    default:
      return "Please enter a valid display name.";
  }
}

function mapTimeZoneProblem(code: string): string {
  switch (code) {
    case "NotBlank":
    case "REQUIRED":
      return "Timezone is required.";
    case "INVALID_TIMEZONE":
      return "Please select a valid IANA timezone.";
    default:
      return "Please select a valid timezone.";
  }
}

function mapLocaleProblem(code: string): string {
  switch (code) {
    case "NotBlank":
    case "REQUIRED":
      return "Locale is required.";
    default:
      return "Please select a valid locale.";
  }
}

function mapWeekStartProblem(code: string): string {
  switch (code) {
    case "Min":
    case "Max":
    case "Range":
      return "Week start must be between 1 (Monday) and 7 (Sunday).";
    default:
      return "Please select a valid week start day.";
  }
}
