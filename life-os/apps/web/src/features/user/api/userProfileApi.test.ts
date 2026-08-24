import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetApiClientConfiguration } from "@lib/apiClient";

import { getPreferences, getProfile, updatePreferences, updateProfile } from "./userProfileApi";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("userProfileApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetApiClientConfiguration();
    vi.unstubAllGlobals();
  });

  it("fetches /user/profile with GET", async () => {
    const profile = {
      id: "00000000-0000-4000-8000-000000000001",
      email: "user@example.test",
      displayName: "Partha",
      timeZone: "Asia/Kolkata",
      locale: "en-IN",
      weekStart: 1,
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, profile));

    const response = await getProfile();

    expect(response).toEqual(profile);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/user/profile");
    expect(init.method).toBe("GET");
  });

  it("puts /user/profile with update payload", async () => {
    const updated = {
      id: "00000000-0000-4000-8000-000000000001",
      email: "user@example.test",
      displayName: "Partha H",
      timeZone: "America/New_York",
      locale: "en-US",
      weekStart: 7,
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updated));

    const response = await updateProfile({
      displayName: "Partha H",
      timeZone: "America/New_York",
      locale: "en-US",
      weekStart: 7,
    });

    expect(response.displayName).toBe("Partha H");
    expect(response.timeZone).toBe("America/New_York");
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/user/profile");
    expect(init.method).toBe("PUT");
  });

  it("fetches /user/preferences with GET", async () => {
    const prefs = {
      userId: "00000000-0000-4000-8000-000000000001",
      onboardingVersion: 1,
      onboardingStatus: "COMPLETED" as const,
      lastCompletedStep: "START" as const,
      onboardingCompletedAt: "2026-08-19T10:00:00Z",
      planningDefaults: {
        workingDays: [1, 2, 3, 4, 5],
        workStartTime: "09:00",
        workEndTime: "17:00",
        overnightSchedule: false,
        dailyFocusTargetMinutes: 120,
        focusDurationMinutes: 25,
        breakDurationMinutes: 5,
        longBreakDurationMinutes: 15,
        focusSessionsBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartFocusSessions: false,
        soundEnabled: false,
        browserNotificationsEnabled: false,
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, prefs));

    const response = await getPreferences();

    expect(response.planningDefaults.focusDurationMinutes).toBe(25);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/user/preferences");
    expect(init.method).toBe("GET");
  });

  it("puts /user/preferences with new defaults", async () => {
    const updated = {
      userId: "00000000-0000-4000-8000-000000000001",
      onboardingVersion: 1,
      onboardingStatus: "COMPLETED" as const,
      lastCompletedStep: "START" as const,
      onboardingCompletedAt: "2026-08-19T10:00:00Z",
      planningDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workStartTime: "08:30",
        workEndTime: "16:30",
        overnightSchedule: false,
        dailyFocusTargetMinutes: 200,
        focusDurationMinutes: 50,
        breakDurationMinutes: 10,
        longBreakDurationMinutes: 20,
        focusSessionsBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartFocusSessions: false,
        soundEnabled: false,
        browserNotificationsEnabled: false,
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, updated));

    const response = await updatePreferences({
      workingDays: [1, 2, 3, 4, 5, 6],
      workStartTime: "08:30",
      workEndTime: "16:30",
      overnightSchedule: false,
      dailyFocusTargetMinutes: 200,
      focusDurationMinutes: 50,
      breakDurationMinutes: 10,
      longBreakDurationMinutes: 20,
      focusSessionsBeforeLongBreak: 4,
      autoStartBreaks: false,
      autoStartFocusSessions: false,
      soundEnabled: false,
      browserNotificationsEnabled: false,
    });

    expect(response.planningDefaults.focusDurationMinutes).toBe(50);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/life-os/api/v1/user/preferences");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toMatchObject({
      longBreakDurationMinutes: 20,
      focusSessionsBeforeLongBreak: 4,
      autoStartBreaks: false,
      autoStartFocusSessions: false,
      soundEnabled: false,
      browserNotificationsEnabled: false,
    });
  });
});
