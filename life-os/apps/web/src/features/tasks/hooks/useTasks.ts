import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";

import {
  listLabels,
  queryTasks,
  type TaskQueryParams,
  type TaskQueryResult,
} from "../api/tasksApi";
import type { TaskFormLabelOption } from "../components/TaskForm";
import type { TaskProjectContext } from "../model/task";

export const TASKS_QUERY_KEY = ["tasks"] as const;
export const LABELS_QUERY_KEY = ["labels"] as const;

export const tasksQueryKeys = {
  all: TASKS_QUERY_KEY,
  lists: () => [...TASKS_QUERY_KEY, "list"] as const,
  list: (params: TaskQueryParams) => [...TASKS_QUERY_KEY, "list", params] as const,
  labels: () => LABELS_QUERY_KEY,
};

export function invalidateTasksQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
}

export function useTasks(
  params: TaskQueryParams = {},
  enabled = true,
  projectById?: ReadonlyMap<string, TaskProjectContext>,
): UseQueryResult<TaskQueryResult, Error> {
  return useQuery({
    queryKey: tasksQueryKeys.list(params),
    queryFn: ({ signal }) => queryTasks(params, signal, projectById),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useTaskLabels(
  enabled = true,
): UseQueryResult<readonly TaskFormLabelOption[], Error> {
  return useQuery({
    queryKey: tasksQueryKeys.labels(),
    queryFn: ({ signal }) => listLabels(signal),
    staleTime: 60_000,
    enabled,
  });
}
