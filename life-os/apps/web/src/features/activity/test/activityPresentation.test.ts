import { describe, expect, it } from "vitest";

import {
  activityFilterEmptyTitle,
  activityMatchesFilter,
  mapActivityEvent,
} from "../model/activityPresentation";
import type { ActivityEventDto, ActivityEventType } from "../api/activityApi";

function event(eventType: ActivityEventType, objectAvailable = true): ActivityEventDto {
  return {
    id: eventType,
    actorUserId: "user-1",
    eventType,
    object: objectAvailable
      ? { type: "TASK", id: "task-1", label: "Prepare weekly review", href: "/tasks/task-1" }
      : null,
    occurredAt: "2026-08-23T08:00:00Z",
  };
}

describe("activity presentation", () => {
  it.each([
    ["PROJECT_UPDATED", "PROJECT", "updated"],
    ["TASK_STATUS_CHANGED", "TASK", "changed the status of"],
    ["SUBTASK_COMPLETED", "SUBTASK", "marked a Subtask done in"],
    ["COMMENT_CREATED", "COMMENT", "commented on"],
  ] as const)("maps %s to its accessible copy and filter", (eventType, filter, action) => {
    const record = event(eventType);
    expect(activityMatchesFilter(record, filter)).toBe(true);
    const mapped = mapActivityEvent(record, "Test User");
    expect(mapped).toEqual(
      expect.objectContaining({
        actorName: "Test User",
        action,
        object: { label: "Prepare weekly review", href: "/tasks/task-1" },
        createdAt: "2026-08-23T08:00:00Z",
      }),
    );
    expect(mapped.icon).toBeTruthy();
  });

  it("preserves the deleted-object fallback and names filtered emptiness honestly", () => {
    expect(mapActivityEvent(event("TASK_DELETED", false), "You").object).toBeUndefined();
    expect(activityFilterEmptyTitle("COMMENT")).toBe("No comment changes on this page");
    expect(activityFilterEmptyTitle("ALL")).toBe("No activity yet");
  });
});
