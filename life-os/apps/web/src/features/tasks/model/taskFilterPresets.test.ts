import { describe, expect, it } from "vitest";

import {
  applyTaskFilterPreset,
  readTaskFilterPreset,
  type TaskFilterPresetId,
} from "./taskFilterPresets";

describe("applyTaskFilterPreset", () => {
  it.each<[TaskFilterPresetId, string]>([
    ["ALL", ""],
    ["TO_DO", "status=TO_DO"],
    ["IN_PROGRESS", "status=IN_PROGRESS"],
    ["DONE", "status=DONE"],
    ["BLOCKED", "status=BLOCKED"],
    ["OVERDUE", "overdue=true"],
  ])("serializes the %s preset with backend-compatible query keys", (preset, expected) => {
    expect(applyTaskFilterPreset(new URLSearchParams(), preset).toString()).toBe(expected);
  });

  it("replaces conflicting preset keys, preserves unrelated filters and resets pagination", () => {
    const current = new URLSearchParams(
      "q=review&projectId=project-1&status=TO_DO&overdue=true&page=4&sortBy=dueAt",
    );

    const next = applyTaskFilterPreset(current, "BLOCKED");

    expect(next.get("q")).toBe("review");
    expect(next.get("projectId")).toBe("project-1");
    expect(next.get("sortBy")).toBe("dueAt");
    expect(next.getAll("status")).toEqual(["BLOCKED"]);
    expect(next.has("overdue")).toBe(false);
    expect(next.has("page")).toBe(false);
  });

  it("does not mutate the caller's URLSearchParams", () => {
    const current = new URLSearchParams("status=TO_DO&page=2");

    applyTaskFilterPreset(current, "OVERDUE");

    expect(current.toString()).toBe("status=TO_DO&page=2");
  });
});

describe("readTaskFilterPreset", () => {
  it.each<[string, TaskFilterPresetId]>([
    ["", "ALL"],
    ["overdue=false", "ALL"],
    ["status=TO_DO", "TO_DO"],
    ["status=IN_PROGRESS", "IN_PROGRESS"],
    ["status=DONE", "DONE"],
    ["status=BLOCKED", "BLOCKED"],
    ["overdue=true", "OVERDUE"],
    ["priority=P1&status=DONE", "DONE"],
  ])("reads %s as %s", (query, expected) => {
    expect(readTaskFilterPreset(new URLSearchParams(query))).toBe(expected);
  });

  it.each([
    "status=CANCELLED",
    "status=UNKNOWN",
    "status=TO_DO&status=BLOCKED",
    "status=TO_DO&overdue=true",
    "overdue=maybe",
  ])("does not claim a single active preset for the custom query %s", (query) => {
    expect(readTaskFilterPreset(new URLSearchParams(query))).toBeNull();
  });
});
