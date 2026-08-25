import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import {
  createWeeklyPlan,
  finalizeWeeklyPlan,
  getWeeklyPlan,
  listWeeklyPlans,
  mapWeeklyPlanResponse,
  reopenWeeklyPlan,
  updateWeeklyPlan,
  type WeeklyPlanResponseDto,
} from "../api/weekPlannerApi";

vi.mock("@lib/apiClient", () => ({ apiRequest: vi.fn() }));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_DTO: WeeklyPlanResponseDto = {
  id: "plan-1",
  weekStartDate: "2026-08-17",
  weekEndDate: "2026-08-23",
  timeZone: "America/New_York",
  weekStartDay: 1,
  revision: 1,
  status: "DRAFT",
  capacities: [
    { localDate: "2026-08-17", availableMinutes: 480 },
    { localDate: "2026-08-18", availableMinutes: 480 },
    { localDate: "2026-08-19", availableMinutes: 480 },
    { localDate: "2026-08-20", availableMinutes: 480 },
    { localDate: "2026-08-21", availableMinutes: 480 },
    { localDate: "2026-08-22", availableMinutes: 0 },
    { localDate: "2026-08-23", availableMinutes: 0 },
  ],
  outcomes: [
    { id: "outcome-1", title: "Launch v2.0 Dashboard", position: 0 },
    { id: "outcome-2", title: "Refactor Auth Security", position: 1 },
  ],
  items: [
    {
      id: "item-1",
      taskId: "task-101",
      outcomeId: "outcome-1",
      plannedDate: "2026-08-17",
      plannedMinutes: 120,
      position: 0,
      taskTitleSnapshot: "Build UI components",
      taskStatusSnapshot: "DONE",
    },
    {
      id: "item-2",
      taskId: "task-102",
      outcomeId: "outcome-2",
      plannedDate: "2026-08-18",
      plannedMinutes: 600,
      position: 1,
      taskTitleSnapshot: "Refactor session cookies",
      taskStatusSnapshot: "IN_PROGRESS",
    },
  ],
  conflictSummary: {
    hasWarnings: true,
    totalPlannedMinutes: 720,
    totalCapacityMinutes: 2400,
    overcapacityMinutes: 120,
    overcapacityDates: ["2026-08-18"],
    overlappingTimeBlockCount: 0,
    unscheduledItemCount: 1,
    outcomesWithoutItemsCount: 0,
  },
  createdAt: "2026-08-17T08:00:00Z",
  updatedAt: "2026-08-17T08:00:00Z",
  version: 3,
};

describe("weekPlannerApi", () => {
  beforeEach(() => vi.resetAllMocks());

  it("maps WeeklyPlanResponseDto into UI models with task context enrichment", () => {
    const mapped = mapWeeklyPlanResponse(
      MOCK_DTO,
      new Map([
        [
          "task-101",
          {
            id: "task-101",
            title: "Build UI components (Updated)",
            status: "DONE",
            priority: "P1",
            projectName: "Frontend Core",
          },
        ],
        [
          "task-102",
          {
            id: "task-102",
            title: "Refactor session cookies",
            status: "IN_PROGRESS",
            priority: "P2",
          },
        ],
      ]),
      "2026-08-18",
    );

    expect(mapped.id).toBe("plan-1");
    expect(mapped.weekLabel).toBe("Aug 17 – Aug 23, 2026");
    expect(mapped.days).toHaveLength(7);
    expect(mapped.outcomes).toHaveLength(2);
    expect(mapped.allocatedTasks).toHaveLength(2);
    expect(mapped.allocatedTasks[0]?.taskTitle).toBe("Build UI components (Updated)");
    expect(mapped.allocatedTasks[0]?.projectName).toBe("Frontend Core");
    expect(mapped.conflicts).toHaveLength(2);
    expect(mapped.conflicts[0]?.type).toBe("OVERCAPACITY");
  });

  it("calls list, get, create, update, finalize, and reopen REST endpoints correctly", async () => {
    mockApiRequest.mockResolvedValue(MOCK_DTO);

    await listWeeklyPlans("2026-08-17");
    await getWeeklyPlan("plan-1");
    await createWeeklyPlan({
      weekDate: "2026-08-17",
      capacities: [{ localDate: "2026-08-17", availableMinutes: 480 }],
      outcomes: [{ title: "Outcome 1", position: 0 }],
      items: [],
    });
    await updateWeeklyPlan("plan-1", {
      capacities: [{ localDate: "2026-08-17", availableMinutes: 480 }],
      outcomes: [{ id: "outcome-1", title: "Outcome 1", position: 0 }],
      items: [],
      version: 3,
    });
    await finalizeWeeklyPlan("plan-1", 3);
    await reopenWeeklyPlan("plan-1", 4);

    expect(mockApiRequest.mock.calls).toEqual([
      ["/weekly-plans?weekDate=2026-08-17", { method: "GET" }],
      ["/weekly-plans/plan-1", { method: "GET" }],
      [
        "/weekly-plans",
        {
          method: "POST",
          body: {
            weekDate: "2026-08-17",
            capacities: [{ localDate: "2026-08-17", availableMinutes: 480 }],
            outcomes: [{ title: "Outcome 1", position: 0 }],
            items: [],
          },
        },
      ],
      [
        "/weekly-plans/plan-1",
        {
          method: "PUT",
          body: {
            capacities: [{ localDate: "2026-08-17", availableMinutes: 480 }],
            outcomes: [{ id: "outcome-1", title: "Outcome 1", position: 0 }],
            items: [],
            version: 3,
          },
        },
      ],
      ["/weekly-plans/plan-1/finalize", { method: "POST", body: { version: 3 } }],
      ["/weekly-plans/plan-1/reopen", { method: "POST", body: { version: 4 } }],
    ]);
  });
});
