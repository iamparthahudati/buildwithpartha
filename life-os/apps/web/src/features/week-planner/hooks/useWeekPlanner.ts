import { useMemo } from "react";
import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";

import { useTasks } from "@features/tasks";
import {
  listWeeklyPlans,
  mapWeeklyPlanResponse,
  type MappedWeeklyPlanData,
  type TaskContextInfo,
  type WeeklyPlanResponseDto,
} from "../api/weekPlannerApi";
import type { WeekPlannerTask } from "../model/weekPlanner";

export const WEEKLY_PLANS_QUERY_KEY = ["weekly-plans"] as const;

export const weeklyPlanQueryKeys = {
  all: WEEKLY_PLANS_QUERY_KEY,
  lists: () => [...WEEKLY_PLANS_QUERY_KEY, "list"] as const,
  list: (weekDate?: string) => [...WEEKLY_PLANS_QUERY_KEY, "list", weekDate ?? "current"] as const,
  detail: (id: string) => [...WEEKLY_PLANS_QUERY_KEY, "detail", id] as const,
};

export function invalidateWeekPlannerQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: WEEKLY_PLANS_QUERY_KEY });
}

export interface UseWeekPlannerResult {
  readonly plan: MappedWeeklyPlanData | null;
  readonly rawPlan: WeeklyPlanResponseDto | null;
  readonly unscheduledTasks: readonly WeekPlannerTask[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

export function useWeekPlanner(
  weekDate?: string,
  selectedDate?: string,
  locale = "en-US",
): UseWeekPlannerResult {
  const queryResult: UseQueryResult<readonly WeeklyPlanResponseDto[], Error> = useQuery({
    queryKey: weeklyPlanQueryKeys.list(weekDate),
    queryFn: ({ signal }) => listWeeklyPlans(weekDate, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const tasksQuery = useTasks({}, true);

  const taskById = useMemo(() => {
    const map = new Map<string, TaskContextInfo>();
    if (tasksQuery.data?.items) {
      for (const t of tasksQuery.data.items) {
        map.set(t.id, {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          ...(t.project?.name ? { projectName: t.project.name } : {}),
        });
      }
    }
    return map;
  }, [tasksQuery.data]);

  const rawPlan = useMemo(() => {
    if (!queryResult.data || queryResult.data.length === 0) {
      return null;
    }
    return queryResult.data[0]!;
  }, [queryResult.data]);

  const mappedPlan = useMemo(() => {
    if (!rawPlan) return null;
    return mapWeeklyPlanResponse(rawPlan, taskById, selectedDate, locale);
  }, [rawPlan, taskById, selectedDate, locale]);

  const allocatedTaskIds = useMemo(() => {
    if (!rawPlan) return new Set<string>();
    return new Set(rawPlan.items.map((i) => i.taskId));
  }, [rawPlan]);

  const unscheduledTasks = useMemo((): readonly WeekPlannerTask[] => {
    if (!tasksQuery.data?.items) return [];

    return tasksQuery.data.items
      .filter((t) => !allocatedTaskIds.has(t.id) && t.status !== "DONE" && t.status !== "CANCELLED")
      .map((t): WeekPlannerTask => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        ...(t.project?.name ? { projectName: t.project.name } : {}),
        ...(t.estimateMinutes ? { estimateMinutes: t.estimateMinutes } : {}),
        ...(t.dueAt ? { dueDate: t.dueAt } : {}),
      }));
  }, [tasksQuery.data, allocatedTaskIds]);

  return {
    plan: mappedPlan,
    rawPlan,
    unscheduledTasks,
    isLoading: queryResult.isLoading || tasksQuery.isLoading,
    isError: queryResult.isError || tasksQuery.isError,
    error: queryResult.error?.message ?? tasksQuery.error?.message ?? null,
    refetch: () => {
      void queryResult.refetch();
      void tasksQuery.refetch();
    },
  };
}
