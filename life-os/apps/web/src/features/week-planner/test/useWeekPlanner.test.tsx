import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";

import { useWeekPlanner } from "../hooks/useWeekPlanner";
import { useWeekPlannerMutations } from "../hooks/useWeekPlannerMutations";

vi.mock("@lib/apiClient", () => ({ apiRequest: vi.fn() }));

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_PLAN_DTO = {
  id: "plan-100",
  weekStartDate: "2026-08-17",
  weekEndDate: "2026-08-23",
  timeZone: "UTC",
  weekStartDay: 1,
  revision: 1,
  status: "DRAFT" as const,
  capacities: [
    { localDate: "2026-08-17", availableMinutes: 480 },
    { localDate: "2026-08-18", availableMinutes: 480 },
    { localDate: "2026-08-19", availableMinutes: 480 },
    { localDate: "2026-08-20", availableMinutes: 480 },
    { localDate: "2026-08-21", availableMinutes: 480 },
    { localDate: "2026-08-22", availableMinutes: 0 },
    { localDate: "2026-08-23", availableMinutes: 0 },
  ],
  outcomes: [{ id: "outcome-1", title: "Launch v2.0 Dashboard", position: 0 }],
  items: [
    {
      id: "item-1",
      taskId: "task-101",
      outcomeId: "outcome-1",
      plannedDate: "2026-08-17",
      plannedMinutes: 120,
      position: 0,
      taskTitleSnapshot: "Task 1 title",
      taskStatusSnapshot: "DONE",
    },
  ],
  conflictSummary: {
    hasWarnings: false,
    totalPlannedMinutes: 120,
    totalCapacityMinutes: 2400,
    overcapacityMinutes: 0,
    overcapacityDates: [],
    overlappingTimeBlockCount: 0,
    unscheduledItemCount: 0,
    outcomesWithoutItemsCount: 0,
  },
  createdAt: "2026-08-17T00:00:00Z",
  updatedAt: "2026-08-17T00:00:00Z",
  version: 2,
};

const MOCK_TASKS_DTO = {
  page: {
    items: [
      {
        id: "task-101",
        userId: "user-1",
        title: "Task 1 title (Canonical)",
        status: "DONE" as const,
        priority: "P1" as const,
        overdue: false,
        archived: false,
        progress: 0,
        version: 1,
        createdAt: "2026-08-17T00:00:00Z",
        updatedAt: "2026-08-17T00:00:00Z",
      },
      {
        id: "task-2",
        userId: "user-1",
        title: "Task 2 title (Unscheduled)",
        status: "TO_DO" as const,
        priority: "P2" as const,
        estimateMinutes: 90,
        overdue: false,
        archived: false,
        progress: 0,
        version: 1,
        createdAt: "2026-08-17T00:00:00Z",
        updatedAt: "2026-08-17T00:00:00Z",
      },
    ],
    page: 0,
    size: 50,
    totalItems: 2,
    totalPages: 1,
  },
  summary: {
    total: 2,
    toDo: 1,
    inProgress: 0,
    blocked: 0,
    done: 1,
    cancelled: 0,
    overdue: 0,
    mit: 0,
  },
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useWeekPlanner & useWeekPlannerMutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches weekly plan & tasks, maps plan data, and identifies unscheduled tasks", async () => {
    mockApiRequest.mockImplementation((path) => {
      if (typeof path === "string" && path.startsWith("/weekly-plans")) {
        return Promise.resolve([MOCK_PLAN_DTO]);
      }
      if (typeof path === "string" && path.startsWith("/tasks")) {
        return Promise.resolve(MOCK_TASKS_DTO);
      }
      return Promise.reject(new Error(`Unexpected call: ${String(path)}`));
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useWeekPlanner("2026-08-17"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.plan).not.toBeNull();
    expect(result.current.plan?.id).toBe("plan-100");
    expect(result.current.plan?.allocatedTasks[0]?.taskTitle).toBe("Task 1 title (Canonical)");
    expect(result.current.unscheduledTasks).toHaveLength(1);
    expect(result.current.unscheduledTasks[0]?.id).toBe("task-2");
  });

  it("executes mutations and invalidates linked query projections on success", async () => {
    mockApiRequest.mockImplementation((path, init) => {
      if (typeof path === "string" && path.startsWith("/weekly-plans")) {
        if (init?.method === "PUT" || init?.method === "POST") {
          return Promise.resolve({
            ...MOCK_PLAN_DTO,
            version: MOCK_PLAN_DTO.version + 1,
          });
        }
        return Promise.resolve([MOCK_PLAN_DTO]);
      }
      if (typeof path === "string" && path.startsWith("/tasks")) {
        return Promise.resolve(MOCK_TASKS_DTO);
      }
      return Promise.reject(new Error(`Unexpected call: ${String(path)}`));
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () =>
        useWeekPlannerMutations({
          rawPlan: MOCK_PLAN_DTO,
          targetWeekDate: "2026-08-17",
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await result.current.updateDayCapacity("2026-08-17", 540);
    await result.current.allocateTask("task-2", {
      localDate: "2026-08-18",
      outcomeId: "outcome-1",
      plannedMinutes: 90,
    });
    await result.current.unallocateTask("task-101");
    await result.current.createOutcome("New Outcome");
    await result.current.finalizePlan();
    await result.current.reopenPlan();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["weekly-plans"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["today"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["calendar"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["time-blocks"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["daily-time-summary"] });
  });
});
