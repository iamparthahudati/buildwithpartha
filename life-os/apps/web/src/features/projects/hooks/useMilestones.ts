import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getMilestones } from "../api/milestonesApi";
import type { Milestone } from "../model/milestone";
import { PROJECTS_QUERY_KEY } from "./useProjects";

export const milestonesQueryKeys = {
  all: [...PROJECTS_QUERY_KEY, "milestones"] as const,
  list: (projectId: string) => [...PROJECTS_QUERY_KEY, "milestones", projectId] as const,
};

/** Hook to fetch milestones for a specific project. */
export function useMilestones(
  projectId: string,
  enabled = true,
): UseQueryResult<readonly Milestone[], Error> {
  return useQuery({
    queryKey: milestonesQueryKeys.list(projectId),
    queryFn: ({ signal }) => getMilestones(projectId, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: enabled && Boolean(projectId),
  });
}
