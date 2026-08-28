import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ApiError } from "@lib/apiClient";
import { invalidateActivityQueries } from "@features/activity";

import {
  applyBulkTaskAction,
  archiveTask,
  changeTaskStatus,
  clearTaskMit,
  completeTask,
  createTask,
  deleteTask,
  duplicateTask,
  restoreTask,
  setTaskMit,
  updateTask,
  type CreateTaskRequestDto,
  type TaskQueryResult,
  type UpdateTaskRequestDto,
  type VersionedTaskRequestDto,
} from "../api/tasksApi";
import type { TaskRecord, TaskStatus } from "../model/task";
import type { BulkActionOutcome, BulkTaskAction } from "../model/taskScreen";
import { invalidateTasksQueries, tasksQueryKeys, TASKS_QUERY_KEY } from "./useTasks";

interface VersionedTaskVariables extends VersionedTaskRequestDto {
  readonly id: string;
}

function snapshotLists(queryClient: QueryClient) {
  return queryClient.getQueriesData<TaskQueryResult>({ queryKey: tasksQueryKeys.lists() });
}

function restoreLists(queryClient: QueryClient, previous: ReturnType<typeof snapshotLists>) {
  for (const [key, data] of previous) {
    queryClient.setQueryData(key, data);
  }
}

function patchLists(
  queryClient: QueryClient,
  update: (result: TaskQueryResult) => TaskQueryResult,
) {
  const entries = queryClient.getQueriesData<TaskQueryResult>({ queryKey: tasksQueryKeys.lists() });
  for (const [key, data] of entries) {
    if (data) {
      queryClient.setQueryData(key, update(data));
    }
  }
}

function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function useCreateTask(): UseMutationResult<TaskRecord, Error, CreateTaskRequestDto> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request) => createTask(request),
    onSuccess: () => {
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useUpdateTask(): UseMutationResult<
  TaskRecord,
  Error,
  { readonly id: string; readonly request: UpdateTaskRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => updateTask(id, request),
    onSuccess: () => {
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useCompleteTask(): UseMutationResult<TaskRecord, Error, VersionedTaskVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => completeTask(id, { version }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = snapshotLists(queryClient);
      patchLists(queryClient, (result) => ({
        ...result,
        items: result.items.map((task) =>
          task.id === id
            ? {
                ...task,
                status: "DONE",
                progress: 100,
                isMit: false,
                mitDate: null,
                overdue: false,
              }
            : task,
        ),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) restoreLists(queryClient, context.previous);
    },
    onSuccess: () => {
      void invalidateActivityQueries(queryClient);
    },
    onSettled: () => {
      void invalidateTasksQueries(queryClient);
    },
  });
}

export function useChangeTaskStatus(): UseMutationResult<
  TaskRecord,
  Error,
  { readonly id: string; readonly status: TaskStatus; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, version }) => changeTaskStatus(id, { status, version }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = snapshotLists(queryClient);
      patchLists(queryClient, (result) => ({
        ...result,
        items: result.items.map((task) =>
          task.id === id
            ? {
                ...task,
                status,
                ...(status === "DONE"
                  ? { progress: 100, isMit: false, mitDate: null, overdue: false }
                  : {}),
              }
            : task,
        ),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) restoreLists(queryClient, context.previous);
    },
    onSuccess: () => {
      void invalidateActivityQueries(queryClient);
    },
    onSettled: () => {
      void invalidateTasksQueries(queryClient);
    },
  });
}

export function useArchiveTask(): UseMutationResult<TaskRecord, Error, VersionedTaskVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => archiveTask(id, { version }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = snapshotLists(queryClient);
      patchLists(queryClient, (result) => ({
        ...result,
        items: result.items.filter((task) => task.id !== id),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) restoreLists(queryClient, context.previous);
    },
    onSuccess: () => {
      void invalidateActivityQueries(queryClient);
    },
    onSettled: () => {
      void invalidateTasksQueries(queryClient);
    },
  });
}

export function useRestoreTask(): UseMutationResult<TaskRecord, Error, VersionedTaskVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => restoreTask(id, { version }),
    onSuccess: () => {
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useDeleteTask(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteTask(id),
    onSuccess: () => {
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useDuplicateTask(): UseMutationResult<TaskRecord, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => duplicateTask(id),
    onSuccess: () => {
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useToggleTaskMit(): UseMutationResult<
  TaskRecord,
  Error,
  { readonly task: TaskRecord; readonly date: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, date }) =>
      task.isMit ? clearTaskMit(task.id) : setTaskMit(task.id, date),
    onMutate: async ({ task, date }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previous = snapshotLists(queryClient);
      const nextIsMit = !task.isMit;
      patchLists(queryClient, (result) => ({
        ...result,
        items: result.items.map((item) => {
          if (item.id === task.id) {
            return {
              ...item,
              isMit: nextIsMit,
              mitDate: nextIsMit ? date : null,
            };
          }
          if (nextIsMit && item.isMit && item.mitDate === date) {
            return { ...item, isMit: false, mitDate: null };
          }
          return item;
        }),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) restoreLists(queryClient, context.previous);
    },
    onSuccess: () => {
      void invalidateActivityQueries(queryClient);
    },
    onSettled: () => {
      void invalidateTasksQueries(queryClient);
    },
  });
}

export function useBulkTaskAction(): UseMutationResult<
  BulkActionOutcome,
  Error,
  {
    readonly taskIds: readonly string[];
    readonly action: BulkTaskAction;
    readonly titlesById: ReadonlyMap<string, string>;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskIds, action, titlesById }) =>
      applyBulkTaskAction(taskIds, action, titlesById),
    onSuccess: () => {
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export { isConflict };
export { TASKS_QUERY_KEY } from "./useTasks";
