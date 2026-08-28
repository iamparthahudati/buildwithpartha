import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";

import { getSprint, listSprints, type SprintResponseDto } from "../api/sprintsApi";
import type { SprintStatus } from "../model/sprint";

export const SPRINTS_QUERY_KEY = ["sprints"] as const;

export const sprintQueryKeys = {
  all: SPRINTS_QUERY_KEY,
  list: (statuses: readonly SprintStatus[]) => [...SPRINTS_QUERY_KEY, "list", statuses] as const,
  detail: (id: string) => [...SPRINTS_QUERY_KEY, "detail", id] as const,
};

export function invalidateSprintQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: SPRINTS_QUERY_KEY });
}

export function useSprints(
  statuses: readonly SprintStatus[] = [],
  enabled = true,
): UseQueryResult<readonly SprintResponseDto[], Error> {
  return useQuery({
    queryKey: sprintQueryKeys.list(statuses),
    queryFn: ({ signal }) => listSprints(statuses, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useSprint(
  id: string | null,
  enabled = true,
): UseQueryResult<SprintResponseDto, Error> {
  return useQuery({
    queryKey: sprintQueryKeys.detail(id ?? ""),
    queryFn: ({ signal }) => getSprint(id ?? "", signal),
    staleTime: 30_000,
    enabled: enabled && id !== null,
  });
}
