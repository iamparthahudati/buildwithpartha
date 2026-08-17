import { describe, expect, it } from "vitest";

import { groupActivityEventsByDay } from "./activityGrouping";
import type { ActivityEvent } from "./ActivityFeed";

const NOW = new Date("2026-08-18T18:00:00.000Z");

function event(id: string, createdAt: string): ActivityEvent {
  return { id, actorName: "Ada Lovelace", action: "archived", createdAt };
}

describe("groupActivityEventsByDay", () => {
  it("groups same-UTC-day events into one group labelled Today", () => {
    const groups = groupActivityEventsByDay(
      [event("a", "2026-08-18T09:00:00.000Z"), event("b", "2026-08-18T15:00:00.000Z")],
      "UTC",
      "en-US",
      NOW,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ label: "Today" });
    expect(groups[0]?.events.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("labels the previous calendar day Yesterday", () => {
    const groups = groupActivityEventsByDay(
      [event("a", "2026-08-17T09:00:00.000Z")],
      "UTC",
      "en-US",
      NOW,
    );
    expect(groups[0]).toMatchObject({ label: "Yesterday" });
  });

  it("formats an older day with a real localized date", () => {
    const groups = groupActivityEventsByDay(
      [event("a", "2026-08-10T09:00:00.000Z")],
      "UTC",
      "en-US",
      NOW,
    );
    expect(groups[0]).toMatchObject({ label: "Aug 10, 2026" });
  });

  it("merges non-adjacent same-day events into one group, in their own order", () => {
    const groups = groupActivityEventsByDay(
      [
        event("a", "2026-08-18T09:00:00.000Z"),
        event("b", "2026-08-17T09:00:00.000Z"),
        event("c", "2026-08-18T15:00:00.000Z"),
      ],
      "UTC",
      "en-US",
      NOW,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday"]);
    expect(groups[0]?.events.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("groups by the calendar day in the given timezone, not UTC", () => {
    // NOW (18:00 UTC) is already Aug 19 in Tokyo (UTC+9), so this event's
    // UTC calendar date (Aug 18) and its Tokyo one (Aug 19, matching Tokyo's
    // "today") genuinely differ — proving real timezone conversion runs
    // rather than a UTC pass-through.
    const groups = groupActivityEventsByDay(
      [event("a", "2026-08-18T20:00:00.000Z")],
      "Asia/Tokyo",
      "en-US",
      NOW,
    );
    expect(groups[0]).toMatchObject({ label: "Today" });
  });

  it("returns an empty array for no events", () => {
    expect(groupActivityEventsByDay([], "UTC", "en-US", NOW)).toEqual([]);
  });
});
