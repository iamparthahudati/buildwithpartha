import { describe, expect, it } from "vitest";
import {
  calculateNextOccurrences,
  formatRecurrenceRuleSummary,
  validateRecurrenceRule,
  type RecurrenceRule,
} from "./recurrenceContract";

describe("recurrenceContract", () => {
  describe("validateRecurrenceRule", () => {
    it("validates a daily recurrence rule", () => {
      const rule: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      const result = validateRecurrenceRule(rule);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("rejects non-integer, zero or negative intervals", () => {
      const rule: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 0,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      const result = validateRecurrenceRule(rule);
      expect(result.valid).toBe(false);
      expect(result.errors.intervalValue).toBeDefined();
    });

    it("requires a valid start date format", () => {
      const rule: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "NEVER",
        startDate: "invalid-date",
        timeZone: "UTC",
      };
      const result = validateRecurrenceRule(rule);
      expect(result.valid).toBe(false);
      expect(result.errors.startDate).toBeDefined();
    });

    it("requires at least one day for weekly recurrence", () => {
      const rule: RecurrenceRule = {
        frequency: "WEEKLY",
        intervalValue: 1,
        daysOfWeek: [],
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      const result = validateRecurrenceRule(rule);
      expect(result.valid).toBe(false);
      expect(result.errors.daysOfWeek).toBeDefined();
    });

    it("requires dayOfMonth between 1 and 31 for monthly recurrence", () => {
      const rule: RecurrenceRule = {
        frequency: "MONTHLY",
        intervalValue: 1,
        dayOfMonth: 32,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      const result = validateRecurrenceRule(rule);
      expect(result.valid).toBe(false);
      expect(result.errors.dayOfMonth).toBeDefined();
    });

    it("rejects end date before start date or missing end date", () => {
      const ruleBefore: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "UNTIL_DATE",
        endDate: "2026-08-31",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(validateRecurrenceRule(ruleBefore).valid).toBe(false);

      const ruleMissing: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "UNTIL_DATE",
        endDate: null,
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(validateRecurrenceRule(ruleMissing).valid).toBe(false);
    });

    it("validates COUNT end mode bounds", () => {
      const ruleInvalidCount: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "COUNT",
        endCount: 0,
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(validateRecurrenceRule(ruleInvalidCount).valid).toBe(false);
    });
  });

  describe("formatRecurrenceRuleSummary", () => {
    it("formats daily and interval recurrence summary", () => {
      const rule1: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule1)).toBe("Repeats daily");

      const rule2: RecurrenceRule = {
        frequency: "INTERVAL",
        intervalValue: 3,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule2)).toBe("Repeats every 3 days");
    });

    it("formats weekday recurrence summary", () => {
      const rule1: RecurrenceRule = {
        frequency: "WEEKDAY",
        intervalValue: 1,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule1)).toBe("Repeats every weekday (Mon–Fri)");

      const rule2: RecurrenceRule = {
        frequency: "WEEKDAY",
        intervalValue: 2,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule2)).toBe("Repeats every 2 weekday cycles");
    });

    it("formats weekly recurrence with days summary", () => {
      const rule: RecurrenceRule = {
        frequency: "WEEKLY",
        intervalValue: 2,
        daysOfWeek: ["MONDAY", "WEDNESDAY", "FRIDAY"],
        endMode: "UNTIL_DATE",
        endDate: "2026-12-31",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule)).toBe(
        "Repeats every 2 weeks on Mon, Wed, Fri, until 2026-12-31",
      );
    });

    it("formats monthly recurrence summary", () => {
      const rule1: RecurrenceRule = {
        frequency: "MONTHLY",
        intervalValue: 1,
        dayOfMonth: 15,
        endMode: "COUNT",
        endCount: 10,
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule1)).toBe(
        "Repeats monthly on day 15, for 10 occurrences",
      );

      const rule2: RecurrenceRule = {
        frequency: "MONTHLY",
        intervalValue: 2,
        dayOfMonth: 1,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule2)).toBe("Repeats every 2 months on day 1");
    });

    it("formats after-completion summary", () => {
      const rule: RecurrenceRule = {
        frequency: "AFTER_COMPLETION",
        intervalValue: 1,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule)).toBe("Repeats 1 day after completion");
    });

    it("returns error text on invalid rule", () => {
      const rule: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 0,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(formatRecurrenceRuleSummary(rule)).toBe("Invalid recurrence configuration");
    });
  });

  describe("calculateNextOccurrences", () => {
    it("returns empty array for invalid rules or non-positive maxCount", () => {
      const invalidRule: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 0,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(invalidRule, 5)).toEqual([]);

      const validRule: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(validRule, 0)).toEqual([]);
    });

    it("calculates daily occurrences bounded by UNTIL_DATE and COUNT", () => {
      const untilRule: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "UNTIL_DATE",
        endDate: "2026-09-03",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(untilRule, 10)).toEqual([
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
      ]);

      const countRule: RecurrenceRule = {
        frequency: "DAILY",
        intervalValue: 1,
        endMode: "COUNT",
        endCount: 2,
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(countRule, 10)).toEqual(["2026-09-01", "2026-09-02"]);
    });

    it("calculates weekday occurrences bounded by UNTIL_DATE", () => {
      const rule: RecurrenceRule = {
        frequency: "WEEKDAY",
        intervalValue: 1,
        endMode: "UNTIL_DATE",
        endDate: "2026-09-07",
        startDate: "2026-09-04", // Friday
        timeZone: "UTC",
      };
      // Friday Sep 4, Monday Sep 7
      expect(calculateNextOccurrences(rule, 10)).toEqual(["2026-09-04", "2026-09-07"]);
    });

    it("calculates weekly occurrences starting on Sunday (jsDay = 0) or fallback daysOfWeek", () => {
      const ruleSunday: RecurrenceRule = {
        frequency: "WEEKLY",
        intervalValue: 1,
        daysOfWeek: ["SUNDAY", "MONDAY"],
        endMode: "COUNT",
        endCount: 2,
        startDate: "2026-09-06", // Sunday
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(ruleSunday, 5)).toEqual(["2026-09-06", "2026-09-07"]);

      const ruleDefaultDays: RecurrenceRule = {
        frequency: "WEEKLY",
        intervalValue: 1,
        endMode: "COUNT",
        endCount: 2,
        startDate: "2026-09-01", // Tuesday
        timeZone: "UTC",
      };
      // Start date Tuesday -> getRecurrenceDayFromDate returns TUESDAY
      expect(calculateNextOccurrences(ruleDefaultDays, 2)).toEqual(["2026-09-01", "2026-09-08"]);
    });

    it("calculates weekly occurrences bounded by UNTIL_DATE", () => {
      const rule: RecurrenceRule = {
        frequency: "WEEKLY",
        intervalValue: 1,
        daysOfWeek: ["MONDAY", "THURSDAY"],
        endMode: "UNTIL_DATE",
        endDate: "2026-09-07",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(rule, 10)).toEqual(["2026-09-03", "2026-09-07"]);
    });

    it("calculates monthly occurrences with day clamping and fallback dayOfMonth", () => {
      const rule: RecurrenceRule = {
        frequency: "MONTHLY",
        intervalValue: 1,
        dayOfMonth: 31,
        endMode: "UNTIL_DATE",
        endDate: "2026-03-01",
        startDate: "2026-01-31",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(rule, 5)).toEqual(["2026-01-31", "2026-02-28"]);

      const ruleDefaultDayOfMonth: RecurrenceRule = {
        frequency: "MONTHLY",
        intervalValue: 1,
        endMode: "COUNT",
        endCount: 2,
        startDate: "2026-09-15",
        timeZone: "UTC",
      };
      // Start date Sep 15 -> getDayOfMonthFromDate returns 15
      expect(calculateNextOccurrences(ruleDefaultDayOfMonth, 2)).toEqual([
        "2026-09-15",
        "2026-10-15",
      ]);
    });

    it("calculates interval occurrences with intervalValue > 1", () => {
      const rule: RecurrenceRule = {
        frequency: "INTERVAL",
        intervalValue: 4,
        endMode: "COUNT",
        endCount: 3,
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(rule, 5)).toEqual(["2026-09-01", "2026-09-05", "2026-09-09"]);
    });

    it("calculates after-completion initial occurrence with UNTIL_DATE or COUNT boundaries", () => {
      const ruleNever: RecurrenceRule = {
        frequency: "AFTER_COMPLETION",
        intervalValue: 2,
        endMode: "NEVER",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(ruleNever, 5)).toEqual(["2026-09-01"]);

      const ruleCountZero: RecurrenceRule = {
        frequency: "AFTER_COMPLETION",
        intervalValue: 2,
        endMode: "COUNT",
        endCount: 0,
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(ruleCountZero, 5)).toEqual([]);

      const ruleUntilPassed: RecurrenceRule = {
        frequency: "AFTER_COMPLETION",
        intervalValue: 2,
        endMode: "UNTIL_DATE",
        endDate: "2026-08-31",
        startDate: "2026-09-01",
        timeZone: "UTC",
      };
      expect(calculateNextOccurrences(ruleUntilPassed, 5)).toEqual([]);
    });
  });
});
