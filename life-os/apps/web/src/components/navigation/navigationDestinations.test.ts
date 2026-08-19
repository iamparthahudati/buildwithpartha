import { describe, expect, it } from "vitest";

import { DEFAULT_NAV_GROUPS, isNavDestinationActive } from "./navigationDestinations";

describe("navigationDestinations", () => {
  it("exports 4 canonical groups and 14 destinations", () => {
    expect(DEFAULT_NAV_GROUPS).toHaveLength(4);

    const groupIds = DEFAULT_NAV_GROUPS.map((g) => g.id);
    expect(groupIds).toEqual(["execute", "plan", "capture-and-grow", "reflect"]);

    const allItems = DEFAULT_NAV_GROUPS.flatMap((g) => g.items);
    expect(allItems).toHaveLength(14);

    const destinationHrefs = allItems.map((item) => item.href);
    expect(destinationHrefs).toEqual([
      "/life-os/app/today",
      "/life-os/app/tasks",
      "/life-os/app/time-blocks",
      "/life-os/app/projects",
      "/life-os/app/sprints",
      "/life-os/app/week-planner",
      "/life-os/app/calendar",
      "/life-os/app/goals",
      "/life-os/app/notes",
      "/life-os/app/brain-dump",
      "/life-os/app/habits",
      "/life-os/app/progress",
      "/life-os/app/reports",
      "/life-os/app/reviews",
    ]);
  });

  describe("isNavDestinationActive", () => {
    it("returns true for exact matching pathname", () => {
      expect(isNavDestinationActive("/life-os/app/tasks", "/life-os/app/tasks")).toBe(true);
      expect(isNavDestinationActive("/life-os/app/tasks/", "/life-os/app/tasks")).toBe(true);
      expect(isNavDestinationActive("/life-os/app/tasks", "/life-os/app/tasks/")).toBe(true);
    });

    it("returns true for Today when on default /life-os/app", () => {
      expect(isNavDestinationActive("/life-os/app", "/life-os/app/today")).toBe(true);
      expect(isNavDestinationActive("/life-os/app/", "/life-os/app/today")).toBe(true);
      expect(isNavDestinationActive("/life-os/app/today", "/life-os/app/today")).toBe(true);
    });

    it("returns true for nested detail routes", () => {
      expect(isNavDestinationActive("/life-os/app/tasks/task-42", "/life-os/app/tasks")).toBe(true);
      expect(
        isNavDestinationActive("/life-os/app/projects/proj-99/overview", "/life-os/app/projects"),
      ).toBe(true);
    });

    it("returns false for non-matching routes", () => {
      expect(isNavDestinationActive("/life-os/app/projects", "/life-os/app/tasks")).toBe(false);
      expect(isNavDestinationActive("/life-os/app/tasks-archive", "/life-os/app/tasks")).toBe(
        false,
      );
      expect(isNavDestinationActive("", "/life-os/app/tasks")).toBe(false);
      expect(isNavDestinationActive("/life-os/app/tasks", "")).toBe(false);
    });
  });
});
