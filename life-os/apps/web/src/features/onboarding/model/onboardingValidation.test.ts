import { describe, expect, it } from "vitest";

import {
  resolvePlanningDefaultsFieldErrors,
  resolveTimeAndWeekFieldErrors,
  resolveWelcomeFieldErrors,
} from "./onboardingFieldErrors";
import {
  validatePlanningDefaultsForm,
  validateTimeAndWeekForm,
  validateWelcomeForm,
} from "./onboardingValidation";

describe("onboardingValidation", () => {
  describe("validateWelcomeForm", () => {
    it("accepts valid display name", () => {
      expect(validateWelcomeForm({ displayName: "Partha" })).toEqual({});
    });

    it("rejects blank display name", () => {
      expect(validateWelcomeForm({ displayName: "   " })).toEqual({
        displayName: "Enter your display name.",
      });
    });

    it("rejects excessively long display name", () => {
      expect(validateWelcomeForm({ displayName: "A".repeat(101) })).toEqual({
        displayName: "Display name must be 100 characters or fewer.",
      });
    });
  });

  describe("validateTimeAndWeekForm", () => {
    it("accepts valid timezone and weekStart", () => {
      expect(
        validateTimeAndWeekForm({
          timeZone: "Asia/Kolkata",
          locale: "en-IN",
          weekStart: 1,
        }),
      ).toEqual({});
    });

    it("rejects missing or invalid timezone", () => {
      expect(
        validateTimeAndWeekForm({
          timeZone: "",
          locale: "en-US",
          weekStart: 1,
        }),
      ).toEqual({
        timeZone: "Select a timezone.",
      });

      expect(
        validateTimeAndWeekForm({
          timeZone: "Invalid/Zone",
          locale: "en-US",
          weekStart: 1,
        }),
      ).toEqual({
        timeZone: "Select a valid IANA timezone or UTC.",
      });
    });

    it("rejects unsupported week start", () => {
      expect(
        validateTimeAndWeekForm({
          timeZone: "UTC",
          locale: "en-US",
          weekStart: 2,
        }),
      ).toEqual({
        weekStart: "Week start must be Monday, Saturday, or Sunday.",
      });
    });
  });

  describe("validatePlanningDefaultsForm", () => {
    it("accepts valid defaults", () => {
      expect(
        validatePlanningDefaultsForm({
          workingDays: [1, 2, 3, 4, 5],
          workStartTime: "09:00",
          workEndTime: "17:00",
          overnightSchedule: false,
          dailyFocusTargetMinutes: 240,
          focusDurationMinutes: 25,
          breakDurationMinutes: 5,
        }),
      ).toEqual({});
    });

    it("rejects invalid working days", () => {
      expect(
        validatePlanningDefaultsForm({
          workingDays: [0, 8],
          workStartTime: "",
          workEndTime: "",
          overnightSchedule: false,
          dailyFocusTargetMinutes: "",
          focusDurationMinutes: 25,
          breakDurationMinutes: 5,
        }),
      ).toEqual({
        workingDays: "Working days must be days from Monday (1) to Sunday (7).",
      });
    });

    it("rejects non-overnight schedule where end time is before start time", () => {
      expect(
        validatePlanningDefaultsForm({
          workingDays: [1, 2, 3, 4, 5],
          workStartTime: "18:00",
          workEndTime: "09:00",
          overnightSchedule: false,
          dailyFocusTargetMinutes: "",
          focusDurationMinutes: 25,
          breakDurationMinutes: 5,
        }),
      ).toEqual({
        workEndTime: "End time must be later than start time, or enable overnight schedule.",
      });
    });

    it("allows overnight schedule where end time is before start time", () => {
      expect(
        validatePlanningDefaultsForm({
          workingDays: [1, 2, 3, 4, 5],
          workStartTime: "18:00",
          workEndTime: "09:00",
          overnightSchedule: true,
          dailyFocusTargetMinutes: "",
          focusDurationMinutes: 25,
          breakDurationMinutes: 5,
        }),
      ).toEqual({});
    });

    it("validates focus and break duration bounds", () => {
      expect(
        validatePlanningDefaultsForm({
          workingDays: [],
          workStartTime: "",
          workEndTime: "",
          overnightSchedule: false,
          dailyFocusTargetMinutes: 2000,
          focusDurationMinutes: 0,
          breakDurationMinutes: 300,
        }),
      ).toEqual({
        dailyFocusTargetMinutes:
          "Daily focus target must be between 1 and 1,440 minutes (24 hours).",
        focusDurationMinutes: "Focus duration must be between 1 and 720 minutes.",
        breakDurationMinutes: "Break duration must be between 1 and 180 minutes.",
      });
    });

    it("handles empty duration inputs", () => {
      expect(
        validatePlanningDefaultsForm({
          workingDays: [],
          workStartTime: "",
          workEndTime: "",
          overnightSchedule: false,
          dailyFocusTargetMinutes: "",
          focusDurationMinutes: "",
          breakDurationMinutes: "",
        }),
      ).toEqual({
        focusDurationMinutes: "Enter a focus duration.",
        breakDurationMinutes: "Enter a break duration.",
      });
    });

    it("validates malformed start and end time strings", () => {
      expect(
        validatePlanningDefaultsForm({
          workingDays: [],
          workStartTime: "invalid-time",
          workEndTime: "25:99",
          overnightSchedule: false,
          dailyFocusTargetMinutes: "",
          focusDurationMinutes: 25,
          breakDurationMinutes: 5,
        }),
      ).toEqual({
        workStartTime: "Start time must be formatted as HH:mm.",
        workEndTime: "End time must be formatted as HH:mm.",
      });
    });
  });

  describe("onboardingFieldErrors", () => {
    it("maps server problem field errors", () => {
      const errorWithProblem = {
        problem: {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "Validation failed",
          instance: "/onboarding/welcome",
          code: "VALIDATION_FAILED",
          correlationId: "11111111-1111-4111-8111-111111111111",
          errors: [
            { field: "displayName", code: "Display name cannot be blank" },
            { field: "timeZone", code: "Invalid timezone" },
            { field: "weekStart", code: "Invalid week start" },
            { field: "locale", code: "Invalid locale" },
            { field: "workingDays", code: "Invalid days" },
            { field: "workStartTime", code: "Invalid start time" },
            { field: "workEndTime", code: "Invalid end time" },
            { field: "dailyFocusTargetMinutes", code: "Invalid target" },
            { field: "focusDurationMinutes", code: "Invalid focus" },
            { field: "breakDurationMinutes", code: "Invalid break" },
          ],
        },
      };

      expect(resolveWelcomeFieldErrors(errorWithProblem)).toEqual({
        displayName: "Display name cannot be blank",
      });
      expect(resolveTimeAndWeekFieldErrors(errorWithProblem)).toEqual({
        timeZone: "Invalid timezone",
        weekStart: "Invalid week start",
        locale: "Invalid locale",
      });
      expect(resolvePlanningDefaultsFieldErrors(errorWithProblem)).toEqual({
        workingDays: "Invalid days",
        workStartTime: "Invalid start time",
        workEndTime: "Invalid end time",
        dailyFocusTargetMinutes: "Invalid target",
        focusDurationMinutes: "Invalid focus",
        breakDurationMinutes: "Invalid break",
      });
    });

    it("returns empty object for non-problem errors", () => {
      expect(resolveWelcomeFieldErrors(new Error("network error"))).toEqual({});
      expect(resolveTimeAndWeekFieldErrors(null)).toEqual({});
      expect(resolvePlanningDefaultsFieldErrors(undefined)).toEqual({});
    });
  });
});
