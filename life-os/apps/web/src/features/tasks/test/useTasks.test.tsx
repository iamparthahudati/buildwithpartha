import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as tasksApi from "../api/tasksApi";
import { useCompleteTask, useCreateTask } from "../hooks/useTaskMutations";
import { useTasks } from "../hooks/useTasks";
import type { TaskRecord } from "../model/task";

vi.mock("../api/tasksApi", () => ({
  queryTasks: vi.fn(),
  listLabels: vi.fn(),
  createTask: vi.fn(),
  completeTask: vi.fn(),
  updateTask: vi.fn(),
  archiveTask: vi.fn(),
  restoreTask: vi.fn(),
  deleteTask: vi.fn(),
  duplicateTask: vi.fn(),
  changeTaskStatus: vi.fn(),
  setTaskMit: vi.fn(),
  clearTaskMit: vi.fn(),
  applyBulkTaskAction: vi.fn(),
}));

const mockQueryTasks = vi.mocked(tasksApi.queryTasks);
const mockCreateTask = vi.mocked(tasksApi.createTask);
const mockCompleteTask = vi.mocked(tasksApi.completeTask);

const MOCK_TASK: TaskRecord = {
  id: "task-1",
  title: "Prepare weekly review",
  description: null,
  status: "IN_PROGRESS",
  priority: "P1",
  project: null,
  dueAt: null,
  estimateMinutes: null,
  progress: 40,
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
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe("useTasks and mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads a task page and summary", async () => {
    mockQueryTasks.mockResolvedValueOnce({
      items: [MOCK_TASK],
      page: { items: [], page: 0, size: 10, totalItems: 1, totalPages: 1 },
      summary: { total: 1, toDo: 0, inProgress: 1, done: 0, blocked: 0, overdue: 0 },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks({ page: 0, size: 10 }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]?.title).toBe("Prepare weekly review");
    expect(result.current.data?.summary.inProgress).toBe(1);
  });

  it("creates a task and can complete one", async () => {
    mockCreateTask.mockResolvedValueOnce(MOCK_TASK);
    mockCompleteTask.mockResolvedValueOnce({ ...MOCK_TASK, status: "DONE", progress: 100 });

    const { Wrapper } = createWrapper();
    const create = renderHook(() => useCreateTask(), { wrapper: Wrapper });
    const complete = renderHook(() => useCompleteTask(), { wrapper: Wrapper });

    await create.result.current.mutateAsync({ title: "Prepare weekly review" });
    expect(mockCreateTask).toHaveBeenCalledWith({ title: "Prepare weekly review" });

    await complete.result.current.mutateAsync({ id: "task-1", version: 1 });
    expect(mockCompleteTask).toHaveBeenCalledWith("task-1", { version: 1 });
  });

  it("optimistically marks a task done and rolls back on failure", async () => {
    let rejectComplete: ((error: Error) => void) | undefined;
    mockCompleteTask.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectComplete = reject;
        }),
    );

    const { queryClient, Wrapper } = createWrapper();
    const queryKey = ["tasks", "list", { page: 0, size: 10 }];
    queryClient.setQueryData(queryKey, {
      items: [MOCK_TASK],
      page: { items: [], page: 0, size: 10, totalItems: 1, totalPages: 1 },
      summary: { total: 1, toDo: 0, inProgress: 1, done: 0, blocked: 0, overdue: 0 },
    });

    const complete = renderHook(() => useCompleteTask(), { wrapper: Wrapper });
    const pending = complete.result.current.mutateAsync({ id: "task-1", version: 1 });

    await waitFor(() => {
      const cached = queryClient.getQueryData(queryKey) as { items: Array<{ status: string }> };
      expect(cached.items[0]?.status).toBe("DONE");
    });

    rejectComplete?.(new Error("The update could not be saved."));
    await expect(pending).rejects.toThrow("The update could not be saved.");
    const restored = queryClient.getQueryData(queryKey) as { items: Array<{ status: string }> };
    expect(restored.items[0]?.status).toBe("IN_PROGRESS");
  });
});
