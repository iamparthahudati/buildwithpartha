import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getTaskDetail, type TaskDetail } from "../api/tasksApi";
import type { TaskProjectContext } from "../model/task";
import { tasksQueryKeys } from "./useTasks";

export function useTaskDetail(
  id: string,
  enabled = true,
  projectById?: ReadonlyMap<string, TaskProjectContext>,
): UseQueryResult<TaskDetail, Error> {
  return useQuery({
    queryKey: tasksQueryKeys.detail(id),
    queryFn: ({ signal }) => getTaskDetail(id, signal, projectById),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: Boolean(id) && enabled,
  });
}
