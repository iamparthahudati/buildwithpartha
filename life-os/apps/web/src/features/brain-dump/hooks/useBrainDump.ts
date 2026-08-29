import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { invalidateActivityQueries } from "@features/activity";
import {
  queryBrainDumpItems,
  captureBrainDumpItem,
  updateBrainDumpContent,
  deferBrainDumpItem,
  archiveBrainDumpItem,
  restoreBrainDumpItem,
  deleteBrainDumpItem,
  convertBrainDumpToTask,
  convertBrainDumpToNote,
  convertBrainDumpToProject,
  convertBrainDumpToGoal,
  type BrainDumpQueryParams,
  type CaptureBrainDumpRequestDto,
  type UpdateBrainDumpContentRequestDto,
  type ConvertToTaskRequestDto,
  type ConvertToNoteRequestDto,
  type ConvertToProjectRequestDto,
  type ConvertToGoalRequestDto,
} from "../api/brainDumpApi";
import type { BrainDumpItem, BrainDumpPageResponse } from "../model/brainDumpItem";

export const BRAIN_DUMP_QUERY_KEY = ["brain-dump"] as const;

export const brainDumpQueryKeys = {
  all: BRAIN_DUMP_QUERY_KEY,
  list: (params: BrainDumpQueryParams) => [...BRAIN_DUMP_QUERY_KEY, "list", params] as const,
};

export function invalidateBrainDumpQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: BRAIN_DUMP_QUERY_KEY });
}

export function useBrainDumpItems(
  params: BrainDumpQueryParams = {},
  enabled = true,
): UseQueryResult<BrainDumpPageResponse<BrainDumpItem>, Error> {
  return useQuery({
    queryKey: brainDumpQueryKeys.list(params),
    queryFn: ({ signal }) => queryBrainDumpItems(params, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useCaptureBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  CaptureBrainDumpRequestDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CaptureBrainDumpRequestDto) => captureBrainDumpItem(request),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useUpdateBrainDumpContent(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly request: UpdateBrainDumpContentRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => updateBrainDumpContent(id, request),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
    },
  });
}

export function useDeferBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => deferBrainDumpItem(id, version),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
    },
  });
}

export function useArchiveBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => archiveBrainDumpItem(id, version),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
    },
  });
}

export function useRestoreBrainDumpItem(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => restoreBrainDumpItem(id, version),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
    },
  });
}

export function useDeleteBrainDumpItem(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrainDumpItem(id),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useConvertBrainDumpToTask(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly request?: ConvertToTaskRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request = {} }) => convertBrainDumpToTask(id, request),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useConvertBrainDumpToNote(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly request?: ConvertToNoteRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request = {} }) => convertBrainDumpToNote(id, request),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useConvertBrainDumpToProject(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly request?: ConvertToProjectRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request = {} }) => convertBrainDumpToProject(id, request),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useConvertBrainDumpToGoal(): UseMutationResult<
  BrainDumpItem,
  Error,
  { readonly id: string; readonly request?: ConvertToGoalRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request = {} }) => convertBrainDumpToGoal(id, request),
    onSuccess: () => {
      void invalidateBrainDumpQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}
