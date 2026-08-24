import { apiRequest } from "@lib/apiClient";

/**
 * Typed client calls against `/onboarding/*` (LOS-0513, 25-ONBOARDING-SPECIFICATION.md).
 * Coordinates multi-step onboarding lifecycle and preferences.
 */

export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type OnboardingStep = "WELCOME" | "TIME_AND_WEEK" | "PLANNING_DEFAULTS" | "START";

export interface OnboardingProfileDto {
  readonly displayName: string;
  readonly timeZone: string;
  readonly locale: string;
  readonly weekStart: number;
}

export interface PlanningDefaultsDto {
  readonly workingDays: readonly number[];
  readonly workStartTime: string | null;
  readonly workEndTime: string | null;
  readonly overnightSchedule: boolean;
  readonly dailyFocusTargetMinutes: number | null;
  readonly focusDurationMinutes: number;
  readonly breakDurationMinutes: number;
  readonly longBreakDurationMinutes: number;
  readonly focusSessionsBeforeLongBreak: number;
  readonly autoStartBreaks: boolean;
  readonly autoStartFocusSessions: boolean;
  readonly soundEnabled: boolean;
  readonly browserNotificationsEnabled: boolean;
}

export interface OnboardingResponse {
  readonly onboardingVersion: number;
  readonly onboardingStatus: OnboardingStatus;
  readonly lastCompletedStep: OnboardingStep | null;
  readonly onboardingCompletedAt: string | null;
  readonly profile: OnboardingProfileDto;
  readonly planningDefaults: PlanningDefaultsDto;
}

export interface UpdateWelcomeStepRequest {
  readonly displayName: string;
}

export interface UpdateTimeAndWeekStepRequest {
  readonly timeZone: string;
  readonly locale?: string;
  readonly weekStart?: number;
}

export interface UpdatePlanningDefaultsStepRequest {
  readonly workingDays?: readonly number[];
  readonly workStartTime?: string;
  readonly workEndTime?: string;
  readonly overnightSchedule?: boolean;
  readonly dailyFocusTargetMinutes?: number;
  readonly focusDurationMinutes?: number;
  readonly breakDurationMinutes?: number;
  readonly skipped?: boolean;
}

/** Retrieves the current user's onboarding progress and settings. */
export function getOnboarding(): Promise<OnboardingResponse> {
  return apiRequest<OnboardingResponse>("/onboarding", { method: "GET" });
}

/** Step 1: Saves confirmed display name and marks WELCOME step completed. */
export function updateWelcomeStep(request: UpdateWelcomeStepRequest): Promise<OnboardingResponse> {
  return apiRequest<OnboardingResponse>("/onboarding/welcome", {
    method: "PUT",
    body: request,
  });
}

/** Step 2: Validates and saves IANA timezone, locale, and week start settings. */
export function updateTimeAndWeekStep(
  request: UpdateTimeAndWeekStepRequest,
): Promise<OnboardingResponse> {
  return apiRequest<OnboardingResponse>("/onboarding/time-and-week", {
    method: "PUT",
    body: request,
  });
}

/** Step 3: Saves optional working days, work hours, focus defaults or an explicit skip. */
export function updatePlanningDefaultsStep(
  request: UpdatePlanningDefaultsStepRequest,
): Promise<OnboardingResponse> {
  return apiRequest<OnboardingResponse>("/onboarding/planning-defaults", {
    method: "PUT",
    body: request,
  });
}

/** Step 4: Marks onboarding as completed with current timestamp. */
export function completeOnboarding(): Promise<OnboardingResponse> {
  return apiRequest<OnboardingResponse>("/onboarding/complete", {
    method: "POST",
  });
}
