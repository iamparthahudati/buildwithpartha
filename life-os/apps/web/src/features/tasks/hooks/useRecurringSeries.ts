import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { invalidateActivityQueries } from "@features/activity";
import {
  createRecurringSeries,
  deleteRecurringSeries,
  getRecurringSeries,
  listRecurringSeries,
  skipOccurrence,
  updateRecurringSeries,
  type CreateRecurringSeriesRequestDto,
  type RecurringSeriesResponseDto,
  type SkipOccurrenceRequestDto,
  type UpdateRecurringSeriesRequestDto,
} from "../api/recurringSeriesApi";
import { invalidateTasksQueries } from "./useTasks";

export const RECURRING_SERIES_QUERY_KEY = ["recurring-series"] as const;

export const recurringSeriesQueryKeys = {
  all: RECURRING_SERIES_QUERY_KEY,
  list: () => [...RECURRING_SERIES_QUERY_KEY, "list"] as const,
  detail: (id: string) => [...RECURRING_SERIES_QUERY_KEY, "detail", id] as const,
};

export function useRecurringSeriesList(
  enabled = true,
): UseQueryResult<readonly RecurringSeriesResponseDto[], Error> {
  return useQuery({
    queryKey: recurringSeriesQueryKeys.list(),
    queryFn: () => listRecurringSeries(),
    staleTime: 30_000,
    enabled,
  });
}

export function useRecurringSeries(
  id: string | null | undefined,
  enabled = true,
): UseQueryResult<RecurringSeriesResponseDto, Error> {
  return useQuery({
    queryKey: recurringSeriesQueryKeys.detail(id ?? ""),
    queryFn: () => getRecurringSeries(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
  });
}

export function useCreateRecurringSeries(): UseMutationResult<
  RecurringSeriesResponseDto,
  Error,
  CreateRecurringSeriesRequestDto
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request) => createRecurringSeries(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_SERIES_QUERY_KEY });
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useUpdateRecurringSeries(): UseMutationResult<
  RecurringSeriesResponseDto,
  Error,
  { readonly id: string; readonly request: UpdateRecurringSeriesRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => updateRecurringSeries(id, request),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_SERIES_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: recurringSeriesQueryKeys.detail(variables.id),
      });
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useDeleteRecurringSeries(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteRecurringSeries(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_SERIES_QUERY_KEY });
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useSkipOccurrence(): UseMutationResult<
  void,
  Error,
  { readonly seriesId: string; readonly request: SkipOccurrenceRequestDto }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ seriesId, request }) => skipOccurrence(seriesId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECURRING_SERIES_QUERY_KEY });
      void invalidateTasksQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}
