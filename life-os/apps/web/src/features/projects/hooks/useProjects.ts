import { useQuery, type QueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  queryProjects,
  getProjectDetail,
  type ProjectQueryParams,
  type ProjectQueryResponseDto,
  type ProjectResponseDto,
  type ProjectDetail,
  type PageResponse,
} from "../api/projectsApi";
import type { Project } from "../model/project";

export const PROJECTS_QUERY_KEY = ["projects"] as const;

export const projectsQueryKeys = {
  all: PROJECTS_QUERY_KEY,
  list: (params: ProjectQueryParams) => [...PROJECTS_QUERY_KEY, "list", params] as const,
  detail: (id: string) => [...PROJECTS_QUERY_KEY, "detail", id] as const,
};

/** Shared query invalidation helper across features. */
export function invalidateProjectsQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
}

export interface UseProjectsResult {
  readonly items: readonly Project[];
  readonly page: PageResponse<ProjectResponseDto> | null;
  readonly summary: ProjectQueryResponseDto["summary"] | null;
}

/**
 * Hook to query paginated projects and summary counts from backend REST API.
 */
export function useProjects(
  params: ProjectQueryParams = {},
  enabled = true,
): UseQueryResult<UseProjectsResult, Error> {
  return useQuery({
    queryKey: projectsQueryKeys.list(params),
    queryFn: async ({ signal }) => {
      const result = await queryProjects(params, signal);
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

/** Hook to fetch aggregate details for a single project (project metadata + milestones). */
export function useProjectDetail(id: string, enabled = true): UseQueryResult<ProjectDetail, Error> {
  return useQuery({
    queryKey: projectsQueryKeys.detail(id),
    queryFn: async ({ signal }) => getProjectDetail(id, signal),
    staleTime: 30_000,
    enabled: Boolean(id) && enabled,
  });
}
