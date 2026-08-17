import { describe, expect, it } from "vitest";

import { formatDurationMinutes, fromDurationParts, toDurationParts } from "./duration";

describe("toDurationParts", () => {
  it("splits a minute total into whole hours and the remainder", () => {
    expect(toDurationParts(0)).toEqual({ hours: 0, minutes: 0 });
    expect(toDurationParts(45)).toEqual({ hours: 0, minutes: 45 });
    expect(toDurationParts(60)).toEqual({ hours: 1, minutes: 0 });
    expect(toDurationParts(90)).toEqual({ hours: 1, minutes: 30 });
    expect(toDurationParts(150)).toEqual({ hours: 2, minutes: 30 });
  });

  it("never produces a negative or fractional part", () => {
    expect(toDurationParts(-15)).toEqual({ hours: 0, minutes: 0 });
    expect(toDurationParts(30.6)).toEqual({ hours: 0, minutes: 31 });
  });
});

describe("fromDurationParts", () => {
  it("combines hours and minutes into one total", () => {
    expect(fromDurationParts({ hours: 1, minutes: 30 })).toBe(90);
    expect(fromDurationParts({ hours: 0, minutes: 0 })).toBe(0);
  });

  it("normalizes an overflowing minutes part into whole hours", () => {
    // Typing "90" into a Minutes field is a real, common overflow — this is
    // what carries it into "2 hr 30 min" instead of leaving a bogus 1h90m.
    expect(fromDurationParts({ hours: 1, minutes: 90 })).toBe(150);
    expect(toDurationParts(fromDurationParts({ hours: 1, minutes: 90 }))).toEqual({
      hours: 2,
      minutes: 30,
    });
  });

  it("floors negative parts to zero rather than subtracting", () => {
    expect(fromDurationParts({ hours: -1, minutes: 30 })).toBe(30);
    expect(fromDurationParts({ hours: 1, minutes: -30 })).toBe(60);
  });
});

describe("formatDurationMinutes", () => {
  it("omits a zero part next to one that matters", () => {
    expect(formatDurationMinutes(90, "en-US")).toBe("1 hr 30 min");
    expect(formatDurationMinutes(45, "en-US")).toBe("45 min");
    expect(formatDurationMinutes(120, "en-US")).toBe("2 hr");
  });

  it("shows zero minutes when the whole duration is zero", () => {
    expect(formatDurationMinutes(0, "en-US")).toBe("0 min");
  });

  it("spells the units out in long form", () => {
    expect(formatDurationMinutes(90, "en-US", "long")).toBe("1 hour 30 minutes");
    expect(formatDurationMinutes(60, "en-US", "long")).toBe("1 hour");
  });

  it("localizes and pluralizes through Intl rather than a hand-rolled 's'", () => {
    expect(formatDurationMinutes(1, "en-US", "long")).toBe("1 minute");
    expect(formatDurationMinutes(2, "en-US", "long")).toBe("2 minutes");
  });
});
