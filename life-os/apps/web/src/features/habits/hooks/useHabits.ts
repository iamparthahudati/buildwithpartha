import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { invalidateActivityQueries } from "@features/activity";
import { invalidateTodayQueries } from "@features/today";
import type { LocalDate } from "@lib/localDateTime";

import {
  archiveHabit,
  createHabit,
  createHabitPause,
  getHabit,
  getHabitStatistics,
  listHabitEntries,
  listHabitPauses,
  listHabits,
  removeHabitEntry,
  removeHabitPause,
  restoreHabit,
  setHabitEntry,
  updateHabit,
  type CreateHabitPauseRequest,
  type SaveHabitRequest,
} from "../api/habitsApi";
import type { Habit, HabitEntry, HabitPausePeriod, HabitStatisticsWindow } from "../model/habit";

export const HABITS_QUERY_KEY = ["habits"] as const;

export const habitQueryKeys = {
  all: HABITS_QUERY_KEY,
  list: (archived: boolean) => [...HABITS_QUERY_KEY, "list", { archived }] as const,
  detail: (id: string) => [...HABITS_QUERY_KEY, "detail", id] as const,
  entriesPrefix: (id: string) => [...HABITS_QUERY_KEY, "entries", id] as const,
  entries: (id: string, from: LocalDate, to: LocalDate) =>
    [...HABITS_QUERY_KEY, "entries", id, { from, to }] as const,
  pauses: (id: string) => [...HABITS_QUERY_KEY, "pauses", id] as const,
  statistics: (id: string, from: LocalDate, to: LocalDate) =>
    [...HABITS_QUERY_KEY, "statistics", id, { from, to }] as const,
};

export function invalidateHabitQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: HABITS_QUERY_KEY });
}

export function useHabits(
  archived = false,
  enabled = true,
): UseQueryResult<readonly Habit[], Error> {
  return useQuery({
    queryKey: habitQueryKeys.list(archived),
    queryFn: ({ signal }) => listHabits(archived, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useHabit(id: string, enabled = true): UseQueryResult<Habit, Error> {
  return useQuery({
    queryKey: habitQueryKeys.detail(id),
    queryFn: ({ signal }) => getHabit(id, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: enabled && id !== "",
  });
}

export function useHabitEntries(id: string, from: LocalDate, to: LocalDate, enabled = true) {
  return useQuery({
    queryKey: habitQueryKeys.entries(id, from, to),
    queryFn: ({ signal }) => listHabitEntries(id, from, to, signal),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    enabled: enabled && id !== "",
  });
}

export function useHabitPauses(id: string, enabled = true) {
  return useQuery({
    queryKey: habitQueryKeys.pauses(id),
    queryFn: ({ signal }) => listHabitPauses(id, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: enabled && id !== "",
  });
}

export function useHabitStatistics(id: string, from: LocalDate, to: LocalDate, enabled = true) {
  return useQuery({
    queryKey: habitQueryKeys.statistics(id, from, to),
    queryFn: ({ signal }) => getHabitStatistics(id, from, to, signal),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    enabled: enabled && id !== "",
  });
}

function invalidateHabitEffects(queryClient: QueryClient) {
  void invalidateHabitQueries(queryClient);
  void invalidateTodayQueries(queryClient);
  void invalidateActivityQueries(queryClient);
}

export function useCreateHabit(): UseMutationResult<Habit, Error, SaveHabitRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHabit,
    onSuccess: () => invalidateHabitEffects(queryClient),
  });
}

export function useUpdateHabit(): UseMutationResult<
  Habit,
  Error,
  { readonly id: string; readonly request: SaveHabitRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => updateHabit(id, request),
    onSuccess: (habit) => {
      queryClient.setQueryData(habitQueryKeys.detail(habit.id), habit);
      invalidateHabitEffects(queryClient);
    },
  });
}

export function useArchiveHabit(): UseMutationResult<
  Habit,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => archiveHabit(id, version),
    onSuccess: (habit) => {
      queryClient.setQueryData(habitQueryKeys.detail(habit.id), habit);
      invalidateHabitEffects(queryClient);
    },
  });
}

export function useRestoreHabit(): UseMutationResult<
  Habit,
  Error,
  { readonly id: string; readonly version: number }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }) => restoreHabit(id, version),
    onSuccess: (habit) => {
      queryClient.setQueryData(habitQueryKeys.detail(habit.id), habit);
      invalidateHabitEffects(queryClient);
    },
  });
}

interface SetEntryVariables {
  readonly habit: Habit;
  readonly date: LocalDate;
  readonly count: number;
}

type EntrySnapshot = ReturnType<QueryClient["getQueriesData"]>;

export function useSetHabitEntry(): UseMutationResult<
  HabitEntry | null,
  Error,
  SetEntryVariables,
  { readonly previous: EntrySnapshot }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habit, date, count }) =>
      count > 0
        ? setHabitEntry(habit.id, date, count)
        : removeHabitEntry(habit.id, date).then(() => null),
    onMutate: async ({ habit, date, count }) => {
      const prefix = habitQueryKeys.entriesPrefix(habit.id);
      await queryClient.cancelQueries({ queryKey: prefix });
      const previous = queryClient.getQueriesData<readonly HabitEntry[]>({ queryKey: prefix });

      for (const [key, cached] of previous) {
        if (!cached) continue;
        const existing = cached.find((entry) => entry.localDate === date);
        const withoutDate = cached.filter((entry) => entry.localDate !== date);
        const optimistic =
          count > 0
            ? [
                ...withoutDate,
                {
                  id: existing?.id ?? `optimistic-${habit.id}-${date}`,
                  habitId: habit.id,
                  userId: habit.userId,
                  localDate: date,
                  completedCount: count,
                  createdAt: existing?.createdAt ?? new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  version: existing?.version ?? 0,
                },
              ].sort((a, b) => a.localDate.localeCompare(b.localDate))
            : withoutDate;
        queryClient.setQueryData(key, optimistic);
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.previous ?? []) queryClient.setQueryData(key, value);
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: habitQueryKeys.entriesPrefix(variables.habit.id),
      });
      void queryClient.invalidateQueries({
        queryKey: [...HABITS_QUERY_KEY, "statistics", variables.habit.id],
      });
      void invalidateTodayQueries(queryClient);
      void invalidateActivityQueries(queryClient);
    },
  });
}

export function useCreateHabitPause(): UseMutationResult<
  HabitPausePeriod,
  Error,
  { readonly id: string; readonly request: CreateHabitPauseRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }) => createHabitPause(id, request),
    onSuccess: () => invalidateHabitEffects(queryClient),
  });
}

export function useRemoveHabitPause(): UseMutationResult<
  void,
  Error,
  { readonly id: string; readonly pauseId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pauseId }) => removeHabitPause(id, pauseId),
    onSuccess: () => invalidateHabitEffects(queryClient),
  });
}

export type { SaveHabitRequest, CreateHabitPauseRequest, HabitStatisticsWindow };
