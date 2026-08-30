import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { getMilestoneTasks } from "../api/milestoneTasksApi";
import type { MilestoneTaskSummary, TasksByMilestone } from "../model/milestoneTask";
import { PROJECTS_QUERY_KEY } from "./useProjects";

export const milestoneTasksQueryKeys = {
  all: [...PROJECTS_QUERY_KEY, "milestone-tasks"] as const,
  byMilestone: (milestoneId: string) =>
    [...PROJECTS_QUERY_KEY, "milestone-tasks", milestoneId] as const,
};

export interface UseMilestoneTasksResult {
  readonly tasksByMilestone: TasksByMilestone;
  readonly isPending: boolean;
  readonly isError: boolean;
}

/**
 * Fetches the assigned tasks for each milestone id and returns them keyed by milestone (LOS-0826).
 * Uses one query per milestone so each entry caches and refetches independently.
 */
export function useMilestoneTasks(
  milestoneIds: readonly string[],
  enabled = true,
): UseMilestoneTasksResult {
  const results = useQueries({
    queries: milestoneIds.map((milestoneId) => ({
      queryKey: milestoneTasksQueryKeys.byMilestone(milestoneId),
      queryFn: ({ signal }: { signal: AbortSignal }) => getMilestoneTasks(milestoneId, signal),
      staleTime: 30_000,
      enabled: enabled && Boolean(milestoneId),
    })),
  });

  return useMemo(() => {
    const tasksByMilestone: Record<string, readonly MilestoneTaskSummary[]> = {};
    milestoneIds.forEach((milestoneId, index) => {
      const data = results[index]?.data;
      if (data) tasksByMilestone[milestoneId] = data;
    });
    return {
      tasksByMilestone,
      isPending: results.some((result) => result.isPending),
      isError: results.some((result) => result.isError),
    };
  }, [milestoneIds, results]);
}
