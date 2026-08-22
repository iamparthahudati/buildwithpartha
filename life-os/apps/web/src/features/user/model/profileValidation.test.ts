import { describe, expect, it } from "vitest";

import { resolveLocalizationFieldErrors, resolveProfileFieldErrors } from "./profileFieldErrors";
import { validateLocalizationForm, validateProfileForm } from "./profileValidation";

describe("profileValidation", () => {
  describe("validateProfileForm", () => {
    it("accepts valid display name", () => {
      const errors = validateProfileForm({ displayName: "Partha Hudati" });
      expect(errors).toEqual({});
    });

    it("rejects empty or whitespace display name", () => {
      const errors = validateProfileForm({ displayName: "   " });
      expect(errors.displayName).toBe("Display name is required.");
    });

    it("rejects display name exceeding 100 characters", () => {
      const errors = validateProfileForm({ displayName: "a".repeat(101) });
      expect(errors.displayName).toBe("Display name cannot exceed 100 characters.");
    });
  });

  describe("validateLocalizationForm", () => {
    it("accepts valid timezone, locale, and week start", () => {
      const errors = validateLocalizationForm({
        timeZone: "Asia/Kolkata",
        locale: "en-IN",
        weekStart: 1,
      });
      expect(errors).toEqual({});
    });

    it("rejects empty timezone", () => {
      const errors = validateLocalizationForm({
        timeZone: "",
        locale: "en-IN",
        weekStart: 1,
      });
      expect(errors.timeZone).toBe("Timezone is required.");
    });

    it("rejects invalid IANA timezone", () => {
      const errors = validateLocalizationForm({
        timeZone: "Invalid/Timezone_Name",
        locale: "en-IN",
        weekStart: 1,
      });
      expect(errors.timeZone).toBe("Please select a valid IANA timezone (e.g. Asia/Kolkata, UTC).");
    });

    it("rejects empty locale", () => {
      const errors = validateLocalizationForm({
        timeZone: "UTC",
        locale: "",
        weekStart: 1,
      });
      expect(errors.locale).toBe("Locale is required.");
    });

    it("rejects week start out of 1..7 bounds", () => {
      const errorsMin = validateLocalizationForm({
        timeZone: "UTC",
        locale: "en-IN",
        weekStart: 0,
      });
      expect(errorsMin.weekStart).toBe("Week start must be between 1 (Monday) and 7 (Sunday).");

      const errorsMax = validateLocalizationForm({
        timeZone: "UTC",
        locale: "en-IN",
        weekStart: 8,
      });
      expect(errorsMax.weekStart).toBe("Week start must be between 1 (Monday) and 7 (Sunday).");
    });
  });

  describe("resolveProfileFieldErrors", () => {
    it("maps server problems to profile field errors", () => {
      const error = {
        problem: {
          errors: [
            { field: "displayName", code: "NotBlank" },
            { field: "unrelated", code: "SomeError" },
          ],
        },
      };
      const errors = resolveProfileFieldErrors(error);
      expect(errors.displayName).toBe("Display name is required.");
    });

    it("maps size code to max length error", () => {
      const error = {
        problem: {
          errors: [{ field: "displayName", code: "Size" }],
        },
      };
      const errors = resolveProfileFieldErrors(error);
      expect(errors.displayName).toBe("Display name cannot exceed 100 characters.");
    });

    it("returns empty object for non-problem errors", () => {
      expect(resolveProfileFieldErrors(null)).toEqual({});
      expect(resolveProfileFieldErrors(new Error("Network failure"))).toEqual({});
    });
  });

  describe("resolveLocalizationFieldErrors", () => {
    it("maps server problems to localization field errors", () => {
      const error = {
        problem: {
          errors: [
            { field: "timeZone", code: "INVALID_TIMEZONE" },
            { field: "locale", code: "NotBlank" },
            { field: "weekStart", code: "Range" },
          ],
        },
      };
      const errors = resolveLocalizationFieldErrors(error);
      expect(errors.timeZone).toBe("Please select a valid IANA timezone.");
      expect(errors.locale).toBe("Locale is required.");
      expect(errors.weekStart).toBe("Week start must be between 1 (Monday) and 7 (Sunday).");
    });

    it("returns empty object for non-problem errors", () => {
      expect(resolveLocalizationFieldErrors(null)).toEqual({});
      expect(resolveLocalizationFieldErrors(new Error("Network failure"))).toEqual({});
    });
  });
});
