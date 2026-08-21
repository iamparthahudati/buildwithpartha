import { describe, it, expect } from "vitest";

import type { TaskRecord } from "@features/tasks";

import { mapTaskRecordToProjectOverviewTask } from "./projectTaskMapping";

const BASE_TASK: TaskRecord = {
  id: "task-1",
  title: "Draft outline",
  description: null,
  status: "TO_DO",
  priority: "P2",
  project: { id: "proj-1", name: "Launch" },
  dueAt: "2026-08-21T18:30:00.000Z",
  estimateMinutes: null,
  progress: 0,
  mitDate: null,
  isMit: false,
  commentCount: 0,
  blockerCount: 0,
  overdue: false,
  archivedAt: null,
  labelIds: [],
  version: 1,
  createdAt: "2026-08-21T08:00:00Z",
  updatedAt: "2026-08-21T08:00:00Z",
  href: "/life-os/app/tasks/task-1",
};

describe("mapTaskRecordToProjectOverviewTask", () => {
  it("maps task status and due date into the project overview shape", () => {
    expect(mapTaskRecordToProjectOverviewTask(BASE_TASK, "Asia/Kolkata")).toEqual({
      id: "task-1",
      title: "Draft outline",
      status: "PLANNED",
      priority: "P2",
      dueDate: "2026-08-22",
      href: "/life-os/app/tasks/task-1",
    });
  });

  it("omits dueDate when the task has no due instant", () => {
    expect(mapTaskRecordToProjectOverviewTask({ ...BASE_TASK, dueAt: null }, "UTC")).toEqual({
      id: "task-1",
      title: "Draft outline",
      status: "PLANNED",
      priority: "P2",
      href: "/life-os/app/tasks/task-1",
    });
  });
});
