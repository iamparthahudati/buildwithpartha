import { apiRequest } from "@lib/apiClient";

import type { OnboardingStatus, OnboardingStep, PlanningDefaultsDto } from "@features/onboarding";

export interface UserProfileResponse {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly timeZone: string;
  readonly locale: string;
  readonly weekStart: number;
}

export interface UpdateUserProfileRequest {
  readonly displayName: string;
  readonly timeZone: string;
  readonly locale: string;
  readonly weekStart: number;
}

export interface UserPreferencesResponse {
  readonly userId: string;
  readonly onboardingVersion: number;
  readonly onboardingStatus: OnboardingStatus;
  readonly lastCompletedStep: OnboardingStep | null;
  readonly onboardingCompletedAt: string | null;
  readonly planningDefaults: PlanningDefaultsDto;
}

export interface UpdateUserPreferencesRequest {
  readonly workingDays: readonly number[];
  readonly workStartTime: string | null;
  readonly workEndTime: string | null;
  readonly overnightSchedule: boolean;
  readonly dailyFocusTargetMinutes: number | null;
  readonly focusDurationMinutes: number;
  readonly breakDurationMinutes: number;
}

/** Retrieves the current user's profile and localization settings. */
export function getProfile(): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>("/user/profile", { method: "GET" });
}

/** Updates user display name, timezone, locale, and week start. */
export function updateProfile(request: UpdateUserProfileRequest): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>("/user/profile", {
    method: "PUT",
    body: request,
  });
}

/** Retrieves the current user's planning defaults and preferences. */
export function getPreferences(): Promise<UserPreferencesResponse> {
  return apiRequest<UserPreferencesResponse>("/user/preferences", {
    method: "GET",
  });
}

/** Updates the user's planning defaults, working days, hours, and focus durations. */
export function updatePreferences(
  request: UpdateUserPreferencesRequest,
): Promise<UserPreferencesResponse> {
  return apiRequest<UserPreferencesResponse>("/user/preferences", {
    method: "PUT",
    body: request,
  });
}
