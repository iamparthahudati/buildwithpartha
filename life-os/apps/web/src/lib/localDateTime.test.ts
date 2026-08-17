import { describe, expect, it } from "vitest";

import {
  addLocalDays,
  compareLocalDates,
  formatLocalDate,
  isLocalDate,
  isLocalTime,
  localTimeFromMinutes,
  localTimeToMinutes,
  nowLocalTime,
  resolveLocalDateTime,
  todayLocalDate,
} from "./localDateTime";

describe("local date values", () => {
  it("accepts a calendar date and rejects one that does not exist", () => {
    expect(isLocalDate("2026-08-17")).toBe(true);
    // A leap day that exists, and one that does not.
    expect(isLocalDate("2028-02-29")).toBe(true);
    expect(isLocalDate("2026-02-29")).toBe(false);
    expect(isLocalDate("2026-13-01")).toBe(false);
    expect(isLocalDate("17-08-2026")).toBe(false);
    expect(isLocalDate("2026-08-17T00:00:00Z")).toBe(false);
  });

  it("reads today from the user's timezone, not the browser's", () => {
    // 20:30 UTC is already the next calendar day in Asia/Kolkata (UTC+05:30)
    // and still the previous evening in New York. A user in Kolkata planning
    // their evening must not be shown the day before as "today".
    const instant = new Date("2026-08-17T20:30:00Z");

    expect(todayLocalDate("Asia/Kolkata", instant)).toBe("2026-08-18");
    expect(todayLocalDate("UTC", instant)).toBe("2026-08-17");
    expect(todayLocalDate("America/New_York", instant)).toBe("2026-08-17");
  });

  it("reads the current wall-clock time in 24-hour form whatever the zone", () => {
    const instant = new Date("2026-08-17T20:30:00Z");

    expect(nowLocalTime("Asia/Kolkata", instant)).toBe("02:00");
    expect(nowLocalTime("UTC", instant)).toBe("20:30");
  });

  it("adds calendar days without losing one to an offset", () => {
    expect(addLocalDays("2026-08-17", 1)).toBe("2026-08-18");
    expect(addLocalDays("2026-08-17", -1)).toBe("2026-08-16");
    expect(addLocalDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addLocalDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("treats a day containing a daylight-saving change as one day", () => {
    // 29 March 2026 is the European spring-forward date: 23 hours long as an
    // instant, one calendar day as a deadline.
    expect(addLocalDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addLocalDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("orders dates without parsing them", () => {
    expect(compareLocalDates("2026-08-17", "2026-08-18")).toBe(-1);
    expect(compareLocalDates("2026-09-01", "2026-08-31")).toBe(1);
    expect(compareLocalDates("2026-08-17", "2026-08-17")).toBe(0);
  });

  it("formats a date-only value on its own day in every locale", () => {
    // Formatting through the browser zone is the classic off-by-one: this must
    // read as the seventeenth whatever the machine's clock is set to.
    expect(formatLocalDate("2026-08-17", "en-GB")).toBe("17 Aug 2026");
    expect(formatLocalDate("2026-08-17", "en-US")).toBe("Aug 17, 2026");
    expect(formatLocalDate("2026-01-01", "en-GB", { dateStyle: "long" })).toBe("1 January 2026");
  });
});

describe("local time values", () => {
  it("accepts canonical 24-hour times only", () => {
    expect(isLocalTime("09:30")).toBe(true);
    expect(isLocalTime("23:59")).toBe(true);
    expect(isLocalTime("09:30:15")).toBe(true);
    expect(isLocalTime("24:00")).toBe(false);
    expect(isLocalTime("9:30")).toBe(false);
    expect(isLocalTime("09:30 PM")).toBe(false);
  });

  it("converts to and from minutes since midnight", () => {
    expect(localTimeToMinutes("00:00")).toBe(0);
    expect(localTimeToMinutes("09:30")).toBe(570);
    expect(localTimeToMinutes("23:59")).toBe(1439);

    expect(localTimeFromMinutes(0)).toBe("00:00");
    expect(localTimeFromMinutes(570)).toBe("09:30");
    expect(localTimeFromMinutes(1439)).toBe("23:59");
  });

  it("wraps a time that runs past midnight instead of producing 25:00", () => {
    expect(localTimeFromMinutes(1440)).toBe("00:00");
    expect(localTimeFromMinutes(1500)).toBe("01:00");
    expect(localTimeFromMinutes(-30)).toBe("23:30");
  });
});

describe("resolveLocalDateTime", () => {
  it("resolves an ordinary time to exactly one instant", () => {
    const resolution = resolveLocalDateTime("2026-08-17", "09:30", "America/New_York");

    expect(resolution.kind).toBe("valid");
    expect(resolution).toMatchObject({
      kind: "valid",
      instantMs: Date.UTC(2026, 7, 17, 13, 30),
    });
  });

  it("agrees with a UTC reading of the same wall time", () => {
    const resolution = resolveLocalDateTime("2026-08-17", "09:30", "UTC");

    expect(resolution).toEqual({ kind: "valid", instantMs: Date.UTC(2026, 7, 17, 9, 30) });
  });

  // 2026-03-08 is when America/New_York clocks spring forward: 01:59:59 EST is
  // followed directly by 03:00:00 EDT, so the half hour in between never
  // happens on any clock in that zone.
  it("reports a spring-forward gap as having no valid instant", () => {
    const resolution = resolveLocalDateTime("2026-03-08", "02:30", "America/New_York");

    expect(resolution).toEqual({ kind: "nonexistent" });
  });

  it("resolves the times immediately outside the spring-forward gap normally", () => {
    expect(resolveLocalDateTime("2026-03-08", "01:30", "America/New_York")).toEqual({
      kind: "valid",
      instantMs: Date.UTC(2026, 2, 8, 6, 30), // 01:30 EST = 06:30 UTC
    });
    expect(resolveLocalDateTime("2026-03-08", "03:30", "America/New_York")).toEqual({
      kind: "valid",
      instantMs: Date.UTC(2026, 2, 8, 7, 30), // 03:30 EDT = 07:30 UTC
    });
  });

  // 2026-11-01 is when America/New_York clocks fall back: 01:59:59 EDT is
  // followed by 01:00:00 EST, so every wall time in that hour happens twice.
  it("reports a fall-back repeat as ambiguous, resolved to the earlier occurrence", () => {
    const resolution = resolveLocalDateTime("2026-11-01", "01:30", "America/New_York");

    expect(resolution).toEqual({
      kind: "ambiguous",
      // The first 01:30 is still EDT (UTC-4); the DST offset has not changed
      // yet, which is why it is the earlier of the two instants.
      instantMs: Date.UTC(2026, 10, 1, 5, 30),
    });
  });

  it("resolves the time immediately after the fall-back repeat normally", () => {
    expect(resolveLocalDateTime("2026-11-01", "02:30", "America/New_York")).toEqual({
      kind: "valid",
      instantMs: Date.UTC(2026, 10, 1, 7, 30), // 02:30 EST = 07:30 UTC
    });
  });

  it("finds no gap or ambiguity in a zone with no daylight saving", () => {
    // India does not observe DST, so nothing here should ever be flagged.
    expect(resolveLocalDateTime("2026-03-08", "02:30", "Asia/Kolkata").kind).toBe("valid");
    expect(resolveLocalDateTime("2026-11-01", "01:30", "Asia/Kolkata").kind).toBe("valid");
  });
});
