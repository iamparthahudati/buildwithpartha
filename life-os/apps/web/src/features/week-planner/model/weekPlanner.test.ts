import { describe, expect, it } from "vitest";
import {
  calculateCapacityPercentage,
  filterWeekPlannerTasks,
  formatMinutesToHours,
  type WeekPlannerTask,
} from "./weekPlanner";

describe("weekPlanner models & helpers", () => {
  describe("formatMinutesToHours", () => {
    it("formats zero minutes as 0m", () => {
      expect(formatMinutesToHours(0)).toBe("0m");
      expect(formatMinutesToHours(-10)).toBe("0m");
    });

    it("formats minutes under 1 hour as minutes only", () => {
      expect(formatMinutesToHours(45)).toBe("45m");
      expect(formatMinutesToHours(15)).toBe("15m");
    });

    it("formats exact hours as hours only", () => {
      expect(formatMinutesToHours(60)).toBe("1h");
      expect(formatMinutesToHours(480)).toBe("8h");
    });

    it("formats mixed hours and minutes", () => {
      expect(formatMinutesToHours(90)).toBe("1h 30m");
      expect(formatMinutesToHours(510)).toBe("8h 30m");
    });
  });

  describe("calculateCapacityPercentage", () => {
    it("returns 0 when available capacity is 0 and planned is 0", () => {
      expect(calculateCapacityPercentage(0, 0)).toBe(0);
    });

    it("returns 100 when available capacity is 0 but planned is positive", () => {
      expect(calculateCapacityPercentage(120, 0)).toBe(100);
    });

    it("calculates accurate capacity percentage", () => {
      expect(calculateCapacityPercentage(240, 480)).toBe(50);
      expect(calculateCapacityPercentage(600, 480)).toBe(125);
    });
  });

  describe("filterWeekPlannerTasks", () => {
    const tasks: readonly WeekPlannerTask[] = [
      {
        id: "task-1",
        title: "Prepare weekly review",
        status: "TO_DO",
        priority: "P1",
        projectName: "Learning plan",
      },
      {
        id: "task-2",
        title: "Organize tax documents",
        status: "BLOCKED",
        priority: "P2",
        projectName: "Home records cleanup",
      },
    ];

    it("matches a case-insensitive title or project search", () => {
      expect(
        filterWeekPlannerTasks(tasks, { search: "LEARNING", project: "", priority: "ALL" }),
      ).toEqual([tasks[0]]);
    });

    it("combines project and priority filters", () => {
      expect(
        filterWeekPlannerTasks(tasks, {
          search: "",
          project: "Home records cleanup",
          priority: "P2",
        }),
      ).toEqual([tasks[1]]);
    });
  });
});
