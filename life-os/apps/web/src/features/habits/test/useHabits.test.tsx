import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as habitsApi from "../api/habitsApi";
import { habitQueryKeys, useSetHabitEntry } from "../hooks/useHabits";
import type { Habit, HabitEntry } from "../model/habit";

vi.mock("../api/habitsApi", async () => {
  const actual = await vi.importActual<typeof habitsApi>("../api/habitsApi");
  return { ...actual, setHabitEntry: vi.fn(), removeHabitEntry: vi.fn() };
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
  beforeEach(() => vi.resetAllMocks());

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
});
