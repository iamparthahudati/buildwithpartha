import { isValidTimezone } from "@features/onboarding";

export interface ProfileFormValues {
  readonly displayName: string;
}

export interface ProfileFormErrors {
  readonly displayName?: string;
}

export interface LocalizationFormValues {
  readonly timeZone: string;
  readonly locale: string;
  readonly weekStart: number;
}

export interface LocalizationFormErrors {
  readonly timeZone?: string;
  readonly locale?: string;
  readonly weekStart?: string;
}

export function validateProfileForm(values: ProfileFormValues): ProfileFormErrors {
  const errors: Record<string, string> = {};

  const trimmedName = values.displayName.trim();
  if (trimmedName.length === 0) {
    errors.displayName = "Display name is required.";
  } else if (trimmedName.length > 100) {
    errors.displayName = "Display name cannot exceed 100 characters.";
  }

  return errors;
}

export function validateLocalizationForm(values: LocalizationFormValues): LocalizationFormErrors {
  const errors: Record<string, string> = {};

  if (!values.timeZone || values.timeZone.trim().length === 0) {
    errors.timeZone = "Timezone is required.";
  } else if (!isValidTimezone(values.timeZone)) {
    errors.timeZone = "Please select a valid IANA timezone (e.g. Asia/Kolkata, UTC).";
  }

  if (!values.locale || values.locale.trim().length === 0) {
    errors.locale = "Locale is required.";
  }

  if (values.weekStart < 1 || values.weekStart > 7) {
    errors.weekStart = "Week start must be between 1 (Monday) and 7 (Sunday).";
  }

  return errors;
}
