import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  queryGoals,
  getGoal,
  getGoalDetail,
  getCheckIns,
  getGoalLinks,
  type GoalQueryParams,
  type GoalResponseDto,
  type PageResponse,
} from "../api/goalsApi";
import type { Goal, GoalCheckIn, GoalDetail, GoalLink, GoalSummaryCounts } from "../model/goal";

export const GOALS_QUERY_KEY = ["goals"] as const;

export const goalsQueryKeys = {
  all: GOALS_QUERY_KEY,
  list: (params: GoalQueryParams) => [...GOALS_QUERY_KEY, "list", params] as const,
  single: (id: string) => [...GOALS_QUERY_KEY, "single", id] as const,
  detail: (id: string) => [...GOALS_QUERY_KEY, "detail", id] as const,
  checkIns: (goalId: string, page: number, size: number) =>
    [...GOALS_QUERY_KEY, "checkIns", goalId, page, size] as const,
  links: (goalId: string) => [...GOALS_QUERY_KEY, "links", goalId] as const,
};

export function invalidateGoalsQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
}

export interface UseGoalsResult {
  readonly items: readonly Goal[];
  readonly page: PageResponse<GoalResponseDto> | null;
  readonly summary: GoalSummaryCounts | null;
}

export function useGoals(
  params: GoalQueryParams = {},
  enabled = true,
): UseQueryResult<UseGoalsResult, Error> {
  return useQuery({
    queryKey: goalsQueryKeys.list(params),
    queryFn: async ({ signal }) => {
      const result = await queryGoals(params, signal);
      return {
        items: result.items,
        page: result.page,
        summary: result.summary,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useGoal(id: string, enabled = true): UseQueryResult<Goal, Error> {
  return useQuery({
    queryKey: goalsQueryKeys.single(id),
    queryFn: async ({ signal }) => getGoal(id, signal),
    staleTime: 30_000,
    enabled: Boolean(id) && enabled,
  });
}

export function useGoalDetail(id: string, enabled = true): UseQueryResult<GoalDetail, Error> {
  return useQuery({
    queryKey: goalsQueryKeys.detail(id),
    queryFn: async ({ signal }) => getGoalDetail(id, signal),
    staleTime: 30_000,
    enabled: Boolean(id) && enabled,
  });
}

export function useGoalCheckIns(
  goalId: string,
  page = 0,
  size = 20,
  enabled = true,
): UseQueryResult<PageResponse<GoalCheckIn>, Error> {
  return useQuery({
    queryKey: goalsQueryKeys.checkIns(goalId, page, size),
    queryFn: async ({ signal }) => getCheckIns(goalId, page, size, signal),
    staleTime: 30_000,
    enabled: Boolean(goalId) && enabled,
  });
}

export function useGoalLinks(
  goalId: string,
  enabled = true,
): UseQueryResult<readonly GoalLink[], Error> {
  return useQuery({
    queryKey: goalsQueryKeys.links(goalId),
    queryFn: async ({ signal }) => getGoalLinks(goalId, signal),
    staleTime: 30_000,
    enabled: Boolean(goalId) && enabled,
  });
}
