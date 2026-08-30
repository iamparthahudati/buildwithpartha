import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as habitsApi from "../api/habitsApi";
import {
  habitQueryKeys,
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
} from "../hooks/useHabits";
import type { Habit, HabitEntry, HabitPausePeriod } from "../model/habit";

vi.mock("../api/habitsApi", async () => {
  const actual = await vi.importActual<typeof habitsApi>("../api/habitsApi");
  return {
    ...actual,
    listHabits: vi.fn(),
    getHabit: vi.fn(),
    listHabitEntries: vi.fn(),
    listHabitPauses: vi.fn(),
    getHabitStatistics: vi.fn(),
    createHabit: vi.fn(),
    updateHabit: vi.fn(),
    archiveHabit: vi.fn(),
    restoreHabit: vi.fn(),
    setHabitEntry: vi.fn(),
    removeHabitEntry: vi.fn(),
    createHabitPause: vi.fn(),
    removeHabitPause: vi.fn(),
  };
});

const HABIT: Habit = {
  id: "habit-1",
  userId: "user-1",
  name: "Read",
  cadence: "DAILY",
  targetCount: 2,
  timeZone: "Asia/Kolkata",
  reminderEnabled: false,
  archived: false,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  version: 0,
};

const ENTRY: HabitEntry = {
  id: "entry-1",
  habitId: HABIT.id,
  userId: HABIT.userId,
  localDate: "2026-08-30",
  completedCount: 1,
  createdAt: "2026-08-30T00:00:00Z",
  updatedAt: "2026-08-30T00:00:00Z",
  version: 0,
};

const PAUSE: HabitPausePeriod = {
  id: "pause-1",
  habitId: HABIT.id,
  userId: HABIT.userId,
  startDate: "2026-08-30",
  endDate: null,
  reason: null,
  createdAt: "2026-08-30T00:00:00Z",
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

describe("useSetHabitEntry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(habitsApi.listHabits).mockResolvedValue([HABIT]);
    vi.mocked(habitsApi.getHabit).mockResolvedValue(HABIT);
    vi.mocked(habitsApi.listHabitEntries).mockResolvedValue([ENTRY]);
    vi.mocked(habitsApi.listHabitPauses).mockResolvedValue([PAUSE]);
    vi.mocked(habitsApi.getHabitStatistics).mockResolvedValue({
      habitId: HABIT.id,
      from: "2026-08-01",
      to: "2026-08-30",
      totalDays: 30,
      daysWithEntry: 1,
      daysMeetingTarget: 1,
      totalCompletions: 1,
      dayCompletionRate: 1 / 30,
      currentStreak: 1,
      longestStreak: 1,
      eligiblePeriods: 30,
      metTargetPeriods: 1,
      completionRate: 1 / 30,
    });
    vi.mocked(habitsApi.createHabit).mockResolvedValue(HABIT);
    vi.mocked(habitsApi.updateHabit).mockResolvedValue(HABIT);
    vi.mocked(habitsApi.archiveHabit).mockResolvedValue({ ...HABIT, archived: true });
    vi.mocked(habitsApi.restoreHabit).mockResolvedValue(HABIT);
    vi.mocked(habitsApi.createHabitPause).mockResolvedValue(PAUSE);
    vi.mocked(habitsApi.removeHabitPause).mockResolvedValue(undefined);
  });

  it("optimistically updates the dated entry and keeps the canonical response", async () => {
    vi.mocked(habitsApi.setHabitEntry).mockResolvedValueOnce({
      ...ENTRY,
      completedCount: 2,
      version: 1,
    });
    const { queryClient, Wrapper } = setup();
    const key = habitQueryKeys.entries(HABIT.id, ENTRY.localDate, ENTRY.localDate);
    queryClient.setQueryData(key, [ENTRY]);
    const { result } = renderHook(() => useSetHabitEntry(), { wrapper: Wrapper });

    act(() => result.current.mutate({ habit: HABIT, date: ENTRY.localDate, count: 2 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(habitsApi.setHabitEntry).toHaveBeenCalledWith(HABIT.id, ENTRY.localDate, 2);
  });

  it("restores the exact cached entry snapshot when the write fails", async () => {
    vi.mocked(habitsApi.setHabitEntry).mockRejectedValueOnce(new Error("offline"));
    const { queryClient, Wrapper } = setup();
    const key = habitQueryKeys.entries(HABIT.id, ENTRY.localDate, ENTRY.localDate);
    queryClient.setQueryData(key, [ENTRY]);
    const { result } = renderHook(() => useSetHabitEntry(), { wrapper: Wrapper });

    act(() => result.current.mutate({ habit: HABIT, date: ENTRY.localDate, count: 2 }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(key)).toEqual([ENTRY]);
  });

  it("uses the idempotent remove endpoint when decrementing to zero", async () => {
    vi.mocked(habitsApi.removeHabitEntry).mockResolvedValueOnce(undefined);
    const { queryClient, Wrapper } = setup();
    const key = habitQueryKeys.entries(HABIT.id, ENTRY.localDate, ENTRY.localDate);
    queryClient.setQueryData(key, [ENTRY]);
    const { result } = renderHook(() => useSetHabitEntry(), { wrapper: Wrapper });

    act(() => result.current.mutate({ habit: HABIT, date: ENTRY.localDate, count: 0 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(habitsApi.removeHabitEntry).toHaveBeenCalledWith(HABIT.id, ENTRY.localDate);
  });

  it("runs every Habit query through its bounded canonical endpoint", async () => {
    const { Wrapper } = setup();
    const list = renderHook(() => useHabits(false), { wrapper: Wrapper });
    const detail = renderHook(() => useHabit(HABIT.id), { wrapper: Wrapper });
    const entries = renderHook(() => useHabitEntries(HABIT.id, "2026-08-01", "2026-08-30"), {
      wrapper: Wrapper,
    });
    const pauses = renderHook(() => useHabitPauses(HABIT.id), { wrapper: Wrapper });
    const statistics = renderHook(() => useHabitStatistics(HABIT.id, "2026-08-01", "2026-08-30"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(detail.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(entries.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(pauses.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(statistics.result.current.isSuccess).toBe(true));
  });

  it("runs every Habit lifecycle mutation and invalidates its projections", async () => {
    const { Wrapper } = setup();
    const create = renderHook(() => useCreateHabit(), { wrapper: Wrapper });
    const update = renderHook(() => useUpdateHabit(), { wrapper: Wrapper });
    const archive = renderHook(() => useArchiveHabit(), { wrapper: Wrapper });
    const restore = renderHook(() => useRestoreHabit(), { wrapper: Wrapper });
    const createPause = renderHook(() => useCreateHabitPause(), { wrapper: Wrapper });
    const removePause = renderHook(() => useRemoveHabitPause(), { wrapper: Wrapper });
    const request = {
      name: HABIT.name,
      cadence: HABIT.cadence,
      targetCount: HABIT.targetCount,
      timeZone: HABIT.timeZone,
      reminderEnabled: false,
    };

    await act(async () => {
      await create.result.current.mutateAsync(request);
      await update.result.current.mutateAsync({
        id: HABIT.id,
        request: { ...request, version: 0 },
      });
      await archive.result.current.mutateAsync({ id: HABIT.id, version: 0 });
      await restore.result.current.mutateAsync({ id: HABIT.id, version: 1 });
      await createPause.result.current.mutateAsync({
        id: HABIT.id,
        request: { startDate: "2026-08-30" },
      });
      await removePause.result.current.mutateAsync({ id: HABIT.id, pauseId: PAUSE.id });
    });

    expect(habitsApi.createHabit).toHaveBeenCalledWith(request, expect.anything());
    expect(habitsApi.updateHabit).toHaveBeenCalled();
    expect(habitsApi.archiveHabit).toHaveBeenCalledWith(HABIT.id, 0);
    expect(habitsApi.restoreHabit).toHaveBeenCalledWith(HABIT.id, 1);
    expect(habitsApi.createHabitPause).toHaveBeenCalled();
    expect(habitsApi.removeHabitPause).toHaveBeenCalledWith(HABIT.id, PAUSE.id);
  });
});
