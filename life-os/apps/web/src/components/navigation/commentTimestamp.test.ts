import { describe, expect, it } from "vitest";

import { formatAbsoluteCommentTime, formatRelativeCommentTime } from "./commentTimestamp";

const NOW = new Date("2026-08-18T12:00:00.000Z");

describe("formatRelativeCommentTime", () => {
  it("reads a moment under a minute old as Just now", () => {
    expect(formatRelativeCommentTime("2026-08-18T11:59:30.000Z", "en-US", NOW)).toBe("Just now");
  });

  it("formats minutes ago", () => {
    expect(formatRelativeCommentTime("2026-08-18T11:45:00.000Z", "en-US", NOW)).toBe(
      "15 minutes ago",
    );
  });

  it("formats hours ago", () => {
    expect(formatRelativeCommentTime("2026-08-18T10:00:00.000Z", "en-US", NOW)).toBe("2 hours ago");
  });

  it("formats yesterday", () => {
    expect(formatRelativeCommentTime("2026-08-17T12:00:00.000Z", "en-US", NOW)).toBe("yesterday");
  });

  it("formats a future instant (an optimistic clock skew) without throwing", () => {
    expect(formatRelativeCommentTime("2026-08-18T12:05:00.000Z", "en-US", NOW)).toBe(
      "in 5 minutes",
    );
  });
});

describe("formatAbsoluteCommentTime", () => {
  it("formats a full localized date and time in the given timezone", () => {
    expect(formatAbsoluteCommentTime("2026-08-18T14:32:00.000Z", "en-US", "America/New_York")).toBe(
      "Aug 18, 2026, 10:32 AM",
    );
  });
});
