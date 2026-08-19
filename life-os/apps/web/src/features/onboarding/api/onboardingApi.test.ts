import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import {
  completeOnboarding,
  getOnboarding,
  updatePlanningDefaultsStep,
  updateTimeAndWeekStep,
  updateWelcomeStep,
} from "./onboardingApi";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const mockOnboardingResponse = {
  onboardingVersion: 1,
  onboardingStatus: "NOT_STARTED" as const,
  lastCompletedStep: null,
  onboardingCompletedAt: null,
  profile: {
    displayName: "Partha",
    timeZone: "UTC",
    locale: "en-IN",
    weekStart: 1,
  },
  planningDefaults: {
    workingDays: [1, 2, 3, 4, 5],
    workStartTime: null,
    workEndTime: null,
    overnightSchedule: false,
    dailyFocusTargetMinutes: null,
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
  },
};

describe("onboardingApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("fetches /onboarding with GET", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, mockOnboardingResponse));

    const response = await getOnboarding();

    expect(response).toEqual(mockOnboardingResponse);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/onboarding");
    expect(init.method).toBe("GET");
  });

  it("puts /onboarding/welcome with displayName", async () => {
    const updated = {
      ...mockOnboardingResponse,
      onboardingStatus: "IN_PROGRESS" as const,
      lastCompletedStep: "WELCOME" as const,
      profile: { ...mockOnboardingResponse.profile, displayName: "New Name" },
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updated));

    const response = await updateWelcomeStep({ displayName: "New Name" });

    expect(response.profile.displayName).toBe("New Name");
    expect(response.lastCompletedStep).toBe("WELCOME");
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/onboarding/welcome");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ displayName: "New Name" });
  });

  it("puts /onboarding/time-and-week with timezone, locale, and week start", async () => {
    const updated = {
      ...mockOnboardingResponse,
      lastCompletedStep: "TIME_AND_WEEK" as const,
      profile: {
        ...mockOnboardingResponse.profile,
        timeZone: "Asia/Kolkata",
        locale: "en-US",
        weekStart: 7,
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updated));

    const response = await updateTimeAndWeekStep({
      timeZone: "Asia/Kolkata",
      locale: "en-US",
      weekStart: 7,
    });

    expect(response.profile.timeZone).toBe("Asia/Kolkata");
    expect(response.profile.locale).toBe("en-US");
    expect(response.profile.weekStart).toBe(7);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/onboarding/time-and-week");
    expect(init.method).toBe("PUT");
  });

  it("puts /onboarding/planning-defaults with custom planning settings", async () => {
    const updated = {
      ...mockOnboardingResponse,
      lastCompletedStep: "PLANNING_DEFAULTS" as const,
      planningDefaults: {
        workingDays: [1, 2, 3, 4],
        workStartTime: "09:00",
        workEndTime: "17:00",
        overnightSchedule: false,
        dailyFocusTargetMinutes: 180,
        focusDurationMinutes: 45,
        breakDurationMinutes: 10,
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updated));

    const response = await updatePlanningDefaultsStep({
      workingDays: [1, 2, 3, 4],
      workStartTime: "09:00",
      workEndTime: "17:00",
      overnightSchedule: false,
      dailyFocusTargetMinutes: 180,
      focusDurationMinutes: 45,
      breakDurationMinutes: 10,
    });

    expect(response.planningDefaults.focusDurationMinutes).toBe(45);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/onboarding/planning-defaults");
    expect(init.method).toBe("PUT");
  });

  it("posts to /onboarding/complete", async () => {
    const updated = {
      ...mockOnboardingResponse,
      onboardingStatus: "COMPLETED" as const,
      lastCompletedStep: "START" as const,
      onboardingCompletedAt: "2026-08-19T10:00:00Z",
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updated));

    const response = await completeOnboarding();

    expect(response.onboardingStatus).toBe("COMPLETED");
    expect(response.lastCompletedStep).toBe("START");
    expect(response.onboardingCompletedAt).toBe("2026-08-19T10:00:00Z");
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/onboarding/complete");
    expect(init.method).toBe("POST");
  });
});
