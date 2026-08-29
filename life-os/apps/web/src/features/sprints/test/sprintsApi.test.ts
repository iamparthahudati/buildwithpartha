import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import {
  addSprintTask,
  completeSprint,
  listSprints,
  mapSprintResponse,
  removeSprintTask,
  startSprint,
  updateSprintTask,
  type SprintResponseDto,
} from "../api/sprintsApi";

vi.mock("@lib/apiClient", () => ({ apiRequest: vi.fn() }));

const mockApiRequest = vi.mocked(apiRequest);

const DTO: SprintResponseDto = {
  id: "sprint-1",
  name: "Planning Sprint",
  goal: "Complete the planning flow",
  startDate: "2026-08-25",
  endDate: "2026-08-31",
  status: "ACTIVE",
  targetCapacityPoints: 8,
  committedTaskCount: 0,
  completedTaskCount: 0,
  addedTaskCount: 0,
  removedTaskCount: 0,
  carriedOverTaskCount: 0,
  totalStoryPoints: 0,
  completedStoryPoints: 0,
  actionItems: [],
  completedAt: null,
  createdAt: "2026-08-20T09:00:00Z",
  updatedAt: "2026-08-25T09:00:00Z",
  tasks: [
    {
      id: "commitment-1",
      taskId: "task-1",
      storyPoints: 5,
      position: 0,
      addedAfterStart: false,
      committedAt: "2026-08-20T09:00:00Z",
    },
    {
      id: "commitment-2",
      taskId: "task-2",
      storyPoints: 3,
      position: 1,
      addedAfterStart: true,
      committedAt: "2026-08-26T09:00:00Z",
    },
  ],
  events: [
    {
      id: "event-1",
      eventType: "TASK_ADDED",
      taskId: "task-2",
      pointsDelta: 3,
      reason: "Urgent work",
      occurredAt: "2026-08-26T09:00:00Z",
    },
    {
      id: "event-2",
      eventType: "STARTED",
      occurredAt: "2026-08-25T09:00:00Z",
    },
  ],
  version: 4,
};

describe("sprintsApi", () => {
  beforeEach(() => vi.resetAllMocks());

  it("uses current Task status for live metrics and preserves commitment IDs", () => {
    const mapped = mapSprintResponse(
      DTO,
      new Map([
        [
          "task-1",
          {
            id: "task-1",
            title: "Implement Sprint screen",
            status: "DONE" as const,
            priority: "P1" as const,
            projectName: "LifeOS",
          },
        ],
        [
          "task-2",
          { id: "task-2", title: "Verify responsive states", status: "IN_PROGRESS" as const },
        ],
      ]),
    );

    expect(mapped.sprint).toEqual(
      expect.objectContaining({ totalStoryPoints: 8, completedStoryPoints: 5, version: 4 }),
    );
    expect(mapped.tasks[0]).toEqual(
      expect.objectContaining({ id: "commitment-1", taskId: "task-1", status: "DONE" }),
    );
    expect(mapped.events).toEqual([
      expect.objectContaining({ changeType: "TASK_ADDED", taskTitle: "Verify responsive states" }),
    ]);
  });

  it("keeps completed metrics frozen even when current Task status changes", () => {
    const mapped = mapSprintResponse(
      {
        ...DTO,
        status: "COMPLETED",
        totalStoryPoints: 8,
        completedStoryPoints: 3,
        completedTaskCount: 1,
      },
      new Map([
        ["task-1", { id: "task-1", title: "Task one", status: "DONE" as const }],
        ["task-2", { id: "task-2", title: "Task two", status: "DONE" as const }],
      ]),
    );

    expect(mapped.sprint.completedStoryPoints).toBe(3);
    expect(mapped.sprint.completedTaskCount).toBe(1);
  });

  it("calls the list and lifecycle contracts with versioned payloads", async () => {
    mockApiRequest.mockResolvedValue(DTO);

    await listSprints(["ACTIVE", "PLANNED"]);
    await addSprintTask("sprint-1", {
      taskId: "task-3",
      storyPoints: 2,
      position: 2,
      reason: "Required follow-up",
      version: 4,
    });
    await updateSprintTask("sprint-1", "task-3", {
      storyPoints: 3,
      position: 1,
      reason: null,
      version: 5,
    });
    await removeSprintTask("sprint-1", "task-3", { reason: null, version: 6 });
    await startSprint("sprint-1", 7);
    await completeSprint("sprint-1", {
      actionItems: ["Keep scope visible"],
      carryOverDestination: "NEXT_SPRINT",
      targetSprintId: "sprint-2",
      targetVersion: 2,
      version: 8,
    });

    expect(mockApiRequest.mock.calls).toEqual([
      ["/sprints?status=ACTIVE%2CPLANNED", { method: "GET" }],
      [
        "/sprints/sprint-1/tasks",
        {
          method: "POST",
          body: {
            taskId: "task-3",
            storyPoints: 2,
            position: 2,
            reason: "Required follow-up",
            version: 4,
          },
        },
      ],
      [
        "/sprints/sprint-1/tasks/task-3",
        {
          method: "PUT",
          body: { storyPoints: 3, position: 1, reason: null, version: 5 },
        },
      ],
      [
        "/sprints/sprint-1/tasks/task-3/remove",
        { method: "POST", body: { reason: null, version: 6 } },
      ],
      ["/sprints/sprint-1/start", { method: "POST", body: { version: 7 } }],
      [
        "/sprints/sprint-1/complete",
        {
          method: "POST",
          body: {
            actionItems: ["Keep scope visible"],
            carryOverDestination: "NEXT_SPRINT",
            targetSprintId: "sprint-2",
            targetVersion: 2,
            version: 8,
          },
        },
      ],
    ]);
  });
});
