import { describe, expect, it } from "vitest";

import type { TaskListItem } from "./task";
import {
  formatTaskDueAt,
  isTaskOverdue,
  isTaskTerminal,
  readTaskProgress,
} from "./taskPresentation";

const TASK: TaskListItem = {
  id: "task-1",
  title: "Ship Task components",
  status: "IN_PROGRESS",
  priority: "P1",
  dueAt: "2026-08-21T12:00:00Z",
  progress: 40,
  commentCount: 2,
};

describe("taskPresentation", () => {
  it("clamps and rounds progress readings", () => {
    expect(readTaskProgress(-10)).toBe(0);
    expect(readTaskProgress(42.6)).toBe(43);
    expect(readTaskProgress(140)).toBe(100);
    expect(readTaskProgress(Number.NaN)).toBe(0);
  });

  it("identifies terminal task statuses", () => {
    expect(isTaskTerminal({ ...TASK, status: "DONE" })).toBe(true);
    expect(isTaskTerminal({ ...TASK, status: "CANCELLED" })).toBe(true);
    expect(isTaskTerminal(TASK)).toBe(false);
  });

  it("uses the server overdue projection and safely derives mock fallback state", () => {
    const now = new Date("2026-08-21T13:00:00Z");

    expect(isTaskOverdue(TASK, now)).toBe(true);
    expect(isTaskOverdue({ ...TASK, overdue: false }, now)).toBe(false);
    expect(isTaskOverdue({ ...TASK, status: "DONE", overdue: true }, now)).toBe(false);
    expect(isTaskOverdue({ ...TASK, archivedAt: "2026-08-20T00:00:00Z" }, now)).toBe(false);
    expect(isTaskOverdue({ ...TASK, dueAt: null }, now)).toBe(false);
    expect(isTaskOverdue({ ...TASK, dueAt: "not-an-instant" }, now)).toBe(false);
  });

  it("formats an instant in the confirmed timezone", () => {
    expect(formatTaskDueAt(TASK.dueAt ?? "", "en-US", "Asia/Kolkata")).toBe(
      "Due Aug 21, 2026, 5:30 PM",
    );
    expect(formatTaskDueAt("invalid", "en-US", "UTC")).toBe("Due date unavailable");
  });
});
