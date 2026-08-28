import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as tasksApi from "../api/tasksApi";
import { useTaskDetail } from "../hooks/useTaskDetail";
import { useTaskDetailMutations } from "../hooks/useTaskDetailMutations";
import { tasksQueryKeys } from "../hooks/useTasks";

vi.mock("../api/tasksApi", () => ({
  getTaskDetail: vi.fn(),
  addSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  toggleSubtask: vi.fn(),
  reorderSubtasks: vi.fn(),
  deleteSubtask: vi.fn(),
  addTaskDependency: vi.fn(),
  removeTaskDependency: vi.fn(),
}));

const mockGetTaskDetail = vi.mocked(tasksApi.getTaskDetail);
const mockAddSubtask = vi.mocked(tasksApi.addSubtask);
const mockRemoveTaskDependency = vi.mocked(tasksApi.removeTaskDependency);

const DETAIL = {
  task: {
    id: "task-1",
    title: "Prepare weekly review",
    description: null,
    status: "IN_PROGRESS" as const,
    priority: "P1" as const,
    project: null,
    dueAt: null,
    estimateMinutes: null,
    spentMinutes: 25,
    progress: 40,
    mitDate: null,
    isMit: false,
    commentCount: 0,
    blockerCount: 0,
    overdue: false,
    archivedAt: null,
    deletedAt: null,
    labelIds: [],
    version: 3,
    createdAt: "2026-08-21T08:00:00Z",
    updatedAt: "2026-08-21T09:00:00Z",
  },
  subtasks: [],
  blockers: [],
  dependents: [],
  counts: {
    linkedTimeBlockCount: 0,
    focusSessionCount: 0,
    commentCount: 0,
    attachmentCount: 0,
    activityEventCount: 0,
  },
  version: 3,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe("Task detail query and mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads the aggregate under a stable Task detail cache key", async () => {
    mockGetTaskDetail.mockResolvedValueOnce(DETAIL);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskDetail("task-1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetTaskDetail).toHaveBeenCalledWith("task-1", expect.any(AbortSignal), undefined);
    expect(result.current.data?.task.title).toBe("Prepare weekly review");
    expect(tasksQueryKeys.detail("task-1")).toEqual(["tasks", "detail", "task-1"]);
  });

  it("invalidates canonical Task data after Subtask and dependency mutations", async () => {
    mockAddSubtask.mockResolvedValue({} as never);
    mockRemoveTaskDependency.mockResolvedValue({} as never);
    const { queryClient, Wrapper } = createWrapper();
    const detailKey = tasksQueryKeys.detail("task-1");
    queryClient.setQueryData(detailKey, DETAIL);

    const { result } = renderHook(() => useTaskDetailMutations("task-1"), {
      wrapper: Wrapper,
    });

    await result.current.addSubtask.mutateAsync("Draft decisions");
    expect(mockAddSubtask).toHaveBeenCalledWith("task-1", "Draft decisions");
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);

    queryClient.setQueryData(detailKey, DETAIL);
    await result.current.removeDependency.mutateAsync({
      targetTaskId: "task-dependent",
      relationship: "DEPENDENT",
    });
    expect(mockRemoveTaskDependency).toHaveBeenCalledWith("task-1", "task-dependent", "DEPENDENT");
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
  });
});
