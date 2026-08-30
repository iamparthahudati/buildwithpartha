import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  HabitArchiveDialog,
  HabitDetailsScreen,
  HabitFormDialog,
  HabitPauseDialog,
  HabitsScreen,
  habitIsPausedOn,
  habitQueryKeys,
  listHabitEntries,
  listHabitPauses,
  useArchiveHabit,
  useCreateHabit,
  useCreateHabitPause,
  useHabit,
  useHabitEntries,
  useHabitPauses,
  useHabits,
  useHabitStatistics,
  useRemoveHabitPause,
  useRestoreHabit,
  useSetHabitEntry,
  useUpdateHabit,
  type Habit,
  type HabitDetailView,
  type HabitFormValues,
  type HabitHeatmapDay,
  type HabitListView,
  type HabitPausePeriod,
  type HabitPauseValues,
} from "@features/habits";
import { ApiError } from "@lib/apiClient";
import {
  addLocalDays,
  compareLocalDates,
  isLocalDate,
  todayLocalDate,
  type LocalDate,
} from "@lib/localDateTime";
import { useAuthSession } from "@state/authSession";

type DialogState =
  | { readonly type: "create" }
  | { readonly type: "edit"; readonly habit: Habit }
  | { readonly type: "pause"; readonly habit: Habit }
  | { readonly type: "archive"; readonly habit: Habit }
  | null;

const VALID_LIST_VIEWS = new Set<HabitListView>(["today", "list", "archived"]);
const VALID_DETAIL_VIEWS = new Set<HabitDetailView>(["overview", "history", "statistics"]);

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 409) {
    return "This Habit changed in another tab. Load the latest version before trying again.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function currentPause(
  pauses: readonly HabitPausePeriod[],
  date: LocalDate,
): HabitPausePeriod | undefined {
  return (
    pauses.find((pause) => pause.startDate <= date && pause.endDate == null) ??
    pauses.find((pause) => pause.startDate <= date && (pause.endDate ?? date) >= date)
  );
}

export function HabitsRoute() {
  const { habitId = "" } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [mutationMessage, setMutationMessage] = useState<string>();
  const isDetail = habitId !== "";

  const activeQuery = useHabits(false, user !== null && !isDetail);
  const archivedQuery = useHabits(true, user !== null && !isDetail);
  const detailQuery = useHabit(habitId, user !== null && isDetail);
  const activeHabits = useMemo(() => activeQuery.data ?? [], [activeQuery.data]);
  const archivedHabits = archivedQuery.data ?? [];
  const detailHabit = detailQuery.data;

  const fallbackDate = todayLocalDate(detailHabit?.timeZone ?? user?.timeZone ?? "UTC");
  const dateParam = searchParams.get("date") ?? "";
  const date: LocalDate = isLocalDate(dateParam) ? dateParam : fallbackDate;
  const toParam = searchParams.get("to") ?? "";
  const to: LocalDate = isLocalDate(toParam) ? toParam : date;
  const fromParam = searchParams.get("from") ?? "";
  const requestedFrom: LocalDate = isLocalDate(fromParam) ? fromParam : addLocalDays(to, -83);
  const from: LocalDate =
    compareLocalDates(requestedFrom, to) <= 0 &&
    compareLocalDates(requestedFrom, addLocalDays(to, -365)) >= 0
      ? requestedFrom
      : addLocalDays(to, -83);
  const requestedListView = searchParams.get("view") as HabitListView | null;
  const listView =
    requestedListView && VALID_LIST_VIEWS.has(requestedListView) ? requestedListView : "today";
  const requestedDetailView = searchParams.get("tab") as HabitDetailView | null;
  const detailView =
    requestedDetailView && VALID_DETAIL_VIEWS.has(requestedDetailView)
      ? requestedDetailView
      : "overview";

  const updateParams = (updates: Readonly<Record<string, string | null>>) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(updates).forEach(([key, value]) => {
          if (value == null) next.delete(key);
          else next.set(key, value);
        });
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (dateParam === date && (!isDetail || (fromParam === from && toParam === to))) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("date", date);
        if (isDetail) {
          next.set("from", from);
          next.set("to", to);
        }
        return next;
      },
      { replace: true },
    );
  }, [date, dateParam, from, fromParam, isDetail, setSearchParams, to, toParam]);

  const listEntryQueries = useQueries({
    queries: activeHabits.map((habit) => ({
      queryKey: habitQueryKeys.entries(habit.id, date, date),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listHabitEntries(habit.id, date, date, signal),
      staleTime: 15_000,
    })),
  });
  const listPauseQueries = useQueries({
    queries: activeHabits.map((habit) => ({
      queryKey: habitQueryKeys.pauses(habit.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => listHabitPauses(habit.id, signal),
      staleTime: 30_000,
    })),
  });

  const dayEntryQuery = useHabitEntries(habitId, date, date, user !== null && isDetail);
  const historyEntryQuery = useHabitEntries(habitId, from, to, user !== null && isDetail);
  const detailPausesQuery = useHabitPauses(habitId, user !== null && isDetail);
  const statisticsQuery = useHabitStatistics(habitId, from, to, user !== null && isDetail);

  const createMutation = useCreateHabit();
  const updateMutation = useUpdateHabit();
  const setEntryMutation = useSetHabitEntry();
  const addPauseMutation = useCreateHabitPause();
  const removePauseMutation = useRemoveHabitPause();
  const archiveMutation = useArchiveHabit();
  const restoreMutation = useRestoreHabit();

  const dayStates = useMemo(() => {
    const states = new Map<
      string,
      { count: number; paused: boolean; pending?: boolean; error?: string }
    >();
    activeHabits.forEach((habit, index) => {
      const entryQuery = listEntryQueries[index];
      const pauseQuery = listPauseQueries[index];
      const pending =
        setEntryMutation.isPending &&
        setEntryMutation.variables?.habit.id === habit.id &&
        setEntryMutation.variables.date === date;
      states.set(habit.id, {
        count: entryQuery?.data?.[0]?.completedCount ?? 0,
        paused: habitIsPausedOn(pauseQuery?.data ?? [], date),
        ...(pending ? { pending: true } : {}),
        ...(entryQuery?.isError
          ? { error: errorMessage(entryQuery.error, "This entry couldn't load.") }
          : pauseQuery?.isError
            ? { error: errorMessage(pauseQuery.error, "This Habit's pause state couldn't load.") }
            : {}),
      });
    });
    return states;
  }, [
    activeHabits,
    date,
    listEntryQueries,
    listPauseQueries,
    setEntryMutation.isPending,
    setEntryMutation.variables,
  ]);

  const detailPauses = useMemo(() => detailPausesQuery.data ?? [], [detailPausesQuery.data]);
  const detailCount = dayEntryQuery.data?.[0]?.completedCount ?? 0;
  const detailPaused = habitIsPausedOn(detailPauses, date);
  const heatmapDays: readonly HabitHeatmapDay[] = useMemo(() => {
    if (!detailHabit) return [];
    const countByDate = new Map(
      (historyEntryQuery.data ?? []).map((entry) => [entry.localDate, entry.completedCount]),
    );
    const days: HabitHeatmapDay[] = [];
    let cursor = from;
    while (compareLocalDates(cursor, to) <= 0) {
      days.push({
        localDate: cursor,
        completedCount: countByDate.get(cursor) ?? 0,
        targetCount: detailHabit.targetCount,
        paused: habitIsPausedOn(detailPauses, cursor),
      });
      cursor = addLocalDays(cursor, 1);
    }
    return days;
  }, [detailHabit, detailPauses, from, historyEntryQuery.data, to]);

  const runEntryChange = (habit: Habit, entryDate: LocalDate, delta: number) => {
    const current =
      isDetail && habit.id === habitId ? detailCount : (dayStates.get(habit.id)?.count ?? 0);
    setMutationMessage(undefined);
    setEntryMutation.mutate(
      { habit, date: entryDate, count: Math.max(0, current + delta) },
      {
        onError: (error) =>
          setMutationMessage(
            errorMessage(error, "The entry wasn't saved. Your previous count was restored."),
          ),
      },
    );
  };

  const submitHabit = (values: HabitFormValues) => {
    setMutationMessage(undefined);
    const request = {
      name: values.name,
      description: values.description ?? null,
      cadence: values.cadence,
      targetCount: values.targetCount,
      timeZone: values.timeZone,
      color: values.color ?? null,
      reminderEnabled: values.reminderEnabled,
      reminderTime: values.reminderTime ?? null,
    };
    if (dialog?.type === "edit") {
      updateMutation.mutate(
        { id: dialog.habit.id, request: { ...request, version: dialog.habit.version } },
        {
          onSuccess: () => setDialog(null),
          onError: (error) => setMutationMessage(errorMessage(error, "The Habit wasn't updated.")),
        },
      );
    } else {
      createMutation.mutate(request, {
        onSuccess: () => setDialog(null),
        onError: (error) => setMutationMessage(errorMessage(error, "The Habit wasn't added.")),
      });
    }
  };

  const submitPause = (values: HabitPauseValues) => {
    if (dialog?.type !== "pause") return;
    addPauseMutation.mutate(
      { id: dialog.habit.id, request: values },
      {
        onSuccess: () => setDialog(null),
        onError: (error) => setMutationMessage(errorMessage(error, "The pause wasn't saved.")),
      },
    );
  };

  const resumeHabit = (habit: Habit) => {
    const pauses =
      habit.id === habitId
        ? detailPauses
        : (listPauseQueries[activeHabits.findIndex((item) => item.id === habit.id)]?.data ?? []);
    const pause = currentPause(pauses, date);
    if (!pause) {
      setMutationMessage(
        "No pause covering this date could be found. Load the latest Habit state and try again.",
      );
      return;
    }
    removePauseMutation.mutate(
      { id: habit.id, pauseId: pause.id },
      { onError: (error) => setMutationMessage(errorMessage(error, "The Habit couldn't resume.")) },
    );
  };

  const confirmArchive = (habit: Habit) => {
    archiveMutation.mutate(
      { id: habit.id, version: habit.version },
      {
        onSuccess: () => {
          setDialog(null);
          if (isDetail) navigate("/life-os/app/habits?view=archived");
        },
        onError: (error) => setMutationMessage(errorMessage(error, "The Habit wasn't archived.")),
      },
    );
  };

  const restore = (habit: Habit) => {
    restoreMutation.mutate(
      { id: habit.id, version: habit.version },
      { onError: (error) => setMutationMessage(errorMessage(error, "The Habit wasn't restored.")) },
    );
  };

  if (user === null) return null;

  const openDialog = (next: NonNullable<DialogState>) => {
    setMutationMessage(undefined);
    setDialog(next);
  };

  const sharedActions = {
    onIncrement: (habit: Habit, entryDate: LocalDate) => runEntryChange(habit, entryDate, 1),
    onDecrement: (habit: Habit, entryDate: LocalDate) => runEntryChange(habit, entryDate, -1),
    onEdit: (habit: Habit) => openDialog({ type: "edit", habit }),
    onPause: (habit: Habit) => openDialog({ type: "pause", habit }),
    onResume: resumeHabit,
    onArchive: (habit: Habit) => openDialog({ type: "archive", habit }),
    onRestore: restore,
  };

  return (
    <>
      {isDetail ? (
        <HabitDetailsScreen
          {...(detailHabit ? { habit: detailHabit } : {})}
          date={date}
          from={from}
          to={to}
          view={detailView}
          completedCount={detailCount}
          paused={detailPaused}
          days={heatmapDays}
          {...(statisticsQuery.data ? { statistics: statisticsQuery.data } : {})}
          loading={detailQuery.isPending}
          historyLoading={
            historyEntryQuery.isPending || detailPausesQuery.isPending || statisticsQuery.isPending
          }
          {...(detailQuery.isError
            ? { error: errorMessage(detailQuery.error, "This Habit couldn't load.") }
            : {})}
          {...(historyEntryQuery.isError || detailPausesQuery.isError || statisticsQuery.isError
            ? { historyError: "Habit history couldn't load." }
            : {})}
          {...(dayEntryQuery.isError
            ? { entryError: errorMessage(dayEntryQuery.error, "This dated entry couldn't load.") }
            : {})}
          {...(mutationMessage ? { mutationMessage } : {})}
          entryPending={setEntryMutation.isPending}
          onBack={() => navigate("/life-os/app/habits")}
          onRetry={() => void detailQuery.refetch()}
          onHistoryRetry={() => {
            void historyEntryQuery.refetch();
            void detailPausesQuery.refetch();
            void statisticsQuery.refetch();
          }}
          onDateChange={(next) => updateParams({ date: next })}
          onRangeChange={(nextFrom, nextTo) => updateParams({ from: nextFrom, to: nextTo })}
          onViewChange={(next) => updateParams({ tab: next === "overview" ? null : next })}
          {...sharedActions}
        />
      ) : (
        <HabitsScreen
          habits={activeHabits}
          archivedHabits={archivedHabits}
          dayStates={dayStates}
          date={date}
          view={listView}
          loading={activeQuery.isPending || archivedQuery.isPending}
          {...(activeQuery.isError || archivedQuery.isError
            ? { error: "Habits couldn't load from the server." }
            : {})}
          {...(mutationMessage ? { mutationMessage } : {})}
          onRetry={() => {
            void activeQuery.refetch();
            void archivedQuery.refetch();
            listEntryQueries.forEach((query) => void query.refetch());
            listPauseQueries.forEach((query) => void query.refetch());
          }}
          onDateChange={(next) => updateParams({ date: next })}
          onViewChange={(next) => updateParams({ view: next === "today" ? null : next })}
          onAdd={() => openDialog({ type: "create" })}
          onSelect={(habit) => navigate(`/life-os/app/habits/${habit.id}?date=${date}`)}
          {...sharedActions}
        />
      )}

      <HabitFormDialog
        key={
          dialog?.type === "edit"
            ? `${dialog.habit.id}-${dialog.habit.version}`
            : (dialog?.type ?? "closed")
        }
        open={dialog?.type === "create" || dialog?.type === "edit"}
        mode={dialog?.type === "edit" ? "edit" : "create"}
        initialValues={dialog?.type === "edit" ? dialog.habit : { timeZone: user.timeZone }}
        pending={createMutation.isPending || updateMutation.isPending}
        {...(mutationMessage ? { error: mutationMessage } : {})}
        {...(mutationMessage?.includes("changed in another tab")
          ? { conflictError: mutationMessage }
          : {})}
        onLoadLatest={() => {
          setDialog(null);
          void detailQuery.refetch();
          void activeQuery.refetch();
        }}
        onClose={() => setDialog(null)}
        onSubmit={submitHabit}
      />
      {dialog?.type === "pause" ? (
        <HabitPauseDialog
          open
          habit={dialog.habit}
          defaultStartDate={date}
          pending={addPauseMutation.isPending}
          {...(mutationMessage ? { error: mutationMessage } : {})}
          onClose={() => setDialog(null)}
          onSubmit={submitPause}
        />
      ) : null}
      {dialog?.type === "archive" ? (
        <HabitArchiveDialog
          open
          habit={dialog.habit}
          pending={archiveMutation.isPending}
          {...(mutationMessage ? { error: mutationMessage } : {})}
          onClose={() => setDialog(null)}
          onArchive={confirmArchive}
        />
      ) : null}
    </>
  );
}
