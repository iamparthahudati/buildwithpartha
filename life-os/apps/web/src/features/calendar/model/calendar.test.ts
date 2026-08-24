import { describe, expect, it } from "vitest";

import {
  calendarMonthDates,
  calendarWeekDates,
  eventLocalDate,
  formatCalendarPeriod,
  formatEventTime,
  shiftCalendarPeriod,
  type CalendarEvent,
} from "./calendar";

const TIMED_EVENT: CalendarEvent = {
  id: "time-block:one",
  sourceId: "one",
  sourceType: "TIME_BLOCK",
  title: "Deep work",
  startAt: "2026-08-24T03:30:00Z",
  endAt: "2026-08-24T04:30:00Z",
  allDay: false,
  status: "SCHEDULED",
};

describe("Calendar date model", () => {
  it("builds stable Monday-first week and six-week month ranges across month boundaries", () => {
    expect(calendarWeekDates("2026-08-01")).toEqual([
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
    const month = calendarMonthDates("2026-08-24");
    expect(month).toHaveLength(42);
    expect(month[0]).toBe("2026-07-27");
    expect(month[41]).toBe("2026-09-06");
  });

  it("shifts months without rolling a late date into the following month", () => {
    expect(shiftCalendarPeriod("2026-01-31", "month", 1)).toBe("2026-02-28");
    expect(shiftCalendarPeriod("2028-01-31", "month", 1)).toBe("2028-02-29");
  });

  it("derives timed-event dates and labels in the supplied IANA timezone", () => {
    expect(eventLocalDate(TIMED_EVENT, "Asia/Kolkata")).toBe("2026-08-24");
    expect(formatEventTime(TIMED_EVENT, "en-US", "Asia/Kolkata")).toBe("9:00 AM–10:00 AM");
    expect(formatCalendarPeriod("2026-08-24", "week", "en-US")).toBe("Aug 24–30, 2026");
  });
});
