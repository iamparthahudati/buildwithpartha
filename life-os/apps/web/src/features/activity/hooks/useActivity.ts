import { useQuery, type QueryClient } from "@tanstack/react-query";

import { queryActivity, type ActivityPageDto, type ActivitySubjectType } from "../api/activityApi";

export const ACTIVITY_QUERY_KEY = ["activity"] as const;

export const activityQueryKeys = {
  all: ACTIVITY_QUERY_KEY,
  subject: (subjectType: ActivitySubjectType, subjectId: string) =>
    [...ACTIVITY_QUERY_KEY, subjectType, subjectId] as const,
  page: (subjectType: ActivitySubjectType, subjectId: string, page: number, pageSize: number) =>
    [...activityQueryKeys.subject(subjectType, subjectId), "page", page, pageSize] as const,
};

export function invalidateActivityQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEY });
}

export function useActivity(
  subjectType: ActivitySubjectType,
  subjectId: string,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery<ActivityPageDto, Error>({
    queryKey: activityQueryKeys.page(subjectType, subjectId, page, pageSize),
    queryFn: ({ signal }) => queryActivity(subjectType, subjectId, page, pageSize, signal),
    enabled: Boolean(subjectId) && enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}
