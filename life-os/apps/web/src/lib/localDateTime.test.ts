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
