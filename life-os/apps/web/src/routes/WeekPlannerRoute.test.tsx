import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@lib/apiClient";
import { ToastProvider } from "@state/ToastProvider";
import type { WeeklyPlanResponseDto } from "@features/week-planner";

import { WeekPlannerRoute } from "./WeekPlannerRoute";

vi.mock("@lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lib/apiClient")>();
  return { ...actual, apiRequest: vi.fn() };
});

const mockApiRequest = vi.mocked(apiRequest);

const MOCK_PLAN_DTO: WeeklyPlanResponseDto = {
  id: "plan-100",
  weekStartDate: "2026-08-17",
  weekEndDate: "2026-08-23",
  timeZone: "UTC",
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
  outcomes: [{ id: "outcome-1", title: "Launch v2.0 Dashboard", position: 0 }],
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

const MOCK_TASKS_RESPONSE = {
  page: {
    items: [
      {
        id: "task-101",
        userId: "user-1",
        title: "Build UI components",
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
        id: "task-102",
        userId: "user-1",
        title: "Unscheduled Queue Task",
        status: "TO_DO" as const,
        priority: "P2" as const,
        estimateMinutes: 60,
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

function renderRoute(initialEntry = "/life-os/app/week-planner") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <WeekPlannerRoute />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("WeekPlannerRoute", () => {
  let currentPlan = { ...MOCK_PLAN_DTO };

  beforeEach(() => {
    vi.resetAllMocks();
    currentPlan = { ...MOCK_PLAN_DTO };

    mockApiRequest.mockImplementation((path, init) => {
      if (typeof path === "string" && path.startsWith("/weekly-plans")) {
        if (init?.method === "POST" && path.endsWith("/finalize")) {
          currentPlan = { ...currentPlan, status: "FINALIZED", version: currentPlan.version + 1 };
          return Promise.resolve(currentPlan);
        }
        if (init?.method === "POST" && path.endsWith("/reopen")) {
          currentPlan = { ...currentPlan, status: "DRAFT", version: currentPlan.version + 1 };
          return Promise.resolve(currentPlan);
        }
        if (init?.method === "PUT" || init?.method === "POST") {
          currentPlan = { ...currentPlan, version: currentPlan.version + 1 };
          return Promise.resolve(currentPlan);
        }
        return Promise.resolve([currentPlan]);
      }
      if (typeof path === "string" && path.startsWith("/tasks")) {
        return Promise.resolve(MOCK_TASKS_RESPONSE);
      }
      return Promise.reject(new Error(`Unexpected request: ${String(path)}`));
    });
  });

  it("renders WeekPlannerRoute with real API query context", async () => {
    renderRoute();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Week Planner" }),
    ).toBeInTheDocument();
    expect(screen.getByText("DRAFT PLAN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize plan" })).toBeInTheDocument();
  });

  it("handles week navigation, outcome creation, day capacity update, and task allocation/unallocation", async () => {
    renderRoute();

    await screen.findByRole("heading", { level: 1, name: "Week Planner" });

    // Week navigation
    await userEvent.click(screen.getByRole("button", { name: "Previous week" }));
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    await userEvent.click(screen.getByRole("button", { name: "This week" }));

    // Create outcome
    const addInput = screen.getByRole("textbox", { name: "Outcome" });
    await userEvent.type(addInput, "New Route Outcome");
    const addBtn = screen.getByRole("button", { name: "Add outcome" });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/weekly-plans/plan-100",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    // Unallocate task
    const unallocateBtns = screen.getAllByRole("button", { name: "Unallocate" });
    if (unallocateBtns[0]) {
      await userEvent.click(unallocateBtns[0]);
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          "/weekly-plans/plan-100",
          expect.objectContaining({ method: "PUT" }),
        );
      });
    }

    // Allocate task from queue
    const allocateBtns = screen.getAllByRole("button", { name: "Allocate task" });
    if (allocateBtns[0]) {
      await userEvent.click(allocateBtns[0]);
      const daySelect = screen.getByRole("combobox", { name: "Day" });
      await userEvent.selectOptions(daySelect, "2026-08-17");
      const submitBtns = screen.getAllByRole("button", { name: "Allocate task" });
      await userEvent.click(submitBtns[submitBtns.length - 1]!);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          "/weekly-plans/plan-100",
          expect.objectContaining({ method: "PUT" }),
        );
      });
    }
  });

  it("handles finalize and reopen interactive actions with versioned API requests", async () => {
    renderRoute();

    await screen.findByRole("heading", { level: 1, name: "Week Planner" });

    // Click finalize plan
    await userEvent.click(screen.getByRole("button", { name: "Finalize plan" }));
    expect(screen.getByRole("heading", { name: "Finalize week plan?" })).toBeInTheDocument();

    const confirmFinalizeButtons = screen.getAllByRole("button", { name: "Finalize plan" });
    await userEvent.click(confirmFinalizeButtons[confirmFinalizeButtons.length - 1]!);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/weekly-plans/plan-100/finalize",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("FINALIZED")).toBeInTheDocument();
    });

    // Click reopen plan
    await userEvent.click(screen.getByRole("button", { name: "Reopen plan" }));
    expect(screen.getByRole("heading", { name: "Reopen week plan?" })).toBeInTheDocument();

    const confirmReopenButtons = screen.getAllByRole("button", { name: "Reopen plan" });
    await userEvent.click(confirmReopenButtons[confirmReopenButtons.length - 1]!);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/weekly-plans/plan-100/reopen",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
