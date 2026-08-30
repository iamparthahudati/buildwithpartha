import { apiRequest } from "@lib/apiClient";
import type { LocalDate, LocalTime } from "@lib/localDateTime";

import type {
  Habit,
  HabitCadence,
  HabitColor,
  HabitEntry,
  HabitPausePeriod,
  HabitStatisticsWindow,
} from "../model/habit";

export interface HabitResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly cadence: string;
  readonly targetCount: number;
  readonly timeZone: string;
  readonly color?: string | null;
  readonly reminderEnabled: boolean;
  readonly reminderTime?: LocalTime | null;
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface HabitEntryResponseDto {
  readonly id: string;
  readonly habitId: string;
  readonly userId: string;
  readonly localDate: LocalDate;
  readonly completedCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface HabitPauseResponseDto {
  readonly id: string;
  readonly habitId: string;
  readonly userId: string;
  readonly startDate: LocalDate;
  readonly endDate?: LocalDate | null;
  readonly reason?: string | null;
  readonly createdAt: string;
}

export interface HabitStatsResponseDto {
  readonly habitId: string;
  readonly from: LocalDate;
  readonly to: LocalDate;
  readonly totalDays: number;
  readonly daysWithEntry: number;
  readonly daysMeetingTarget: number;
  readonly totalCompletions: number;
  readonly completionRate: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly eligiblePeriods: number;
  readonly metTargetPeriods: number;
  readonly cadenceCompletionRate: number;
}

export interface SaveHabitRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly cadence: HabitCadence;
  readonly targetCount: number;
  readonly timeZone: string;
  readonly color?: HabitColor | null;
  readonly reminderEnabled: boolean;
  readonly reminderTime?: LocalTime | null;
  readonly version?: number;
}

export interface CreateHabitPauseRequest {
  readonly startDate: LocalDate;
  readonly endDate?: LocalDate | null;
  readonly reason?: string | null;
}

export function mapHabitResponse(dto: HabitResponseDto): Habit {
  return {
    id: dto.id,
    userId: dto.userId,
    name: dto.name,
    description: dto.description ?? null,
    cadence: dto.cadence as HabitCadence,
    targetCount: dto.targetCount,
    timeZone: dto.timeZone,
    color: (dto.color as HabitColor | null | undefined) ?? null,
    reminderEnabled: dto.reminderEnabled,
    reminderTime: dto.reminderTime ?? null,
    archived: dto.archived,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version,
  };
}

export function mapHabitEntry(dto: HabitEntryResponseDto): HabitEntry {
  return { ...dto };
}

export function mapHabitPause(dto: HabitPauseResponseDto): HabitPausePeriod {
  return { ...dto, endDate: dto.endDate ?? null, reason: dto.reason ?? null };
}

export function mapHabitStatistics(dto: HabitStatsResponseDto): HabitStatisticsWindow {
  return {
    habitId: dto.habitId,
    from: dto.from,
    to: dto.to,
    totalDays: dto.totalDays,
    daysWithEntry: dto.daysWithEntry,
    daysMeetingTarget: dto.daysMeetingTarget,
    totalCompletions: dto.totalCompletions,
    dayCompletionRate: dto.completionRate,
    currentStreak: dto.currentStreak,
    longestStreak: dto.longestStreak,
    eligiblePeriods: dto.eligiblePeriods,
    metTargetPeriods: dto.metTargetPeriods,
    completionRate: dto.cadenceCompletionRate,
  };
}

export async function listHabits(
  archived: boolean,
  signal?: AbortSignal,
): Promise<readonly Habit[]> {
  const dtos = await apiRequest<readonly HabitResponseDto[]>(`/habits?archived=${archived}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return dtos.map(mapHabitResponse);
}

export async function getHabit(id: string, signal?: AbortSignal): Promise<Habit> {
  const dto = await apiRequest<HabitResponseDto>(`/habits/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapHabitResponse(dto);
}

export async function createHabit(request: SaveHabitRequest): Promise<Habit> {
  const dto = await apiRequest<HabitResponseDto>("/habits", { method: "POST", body: request });
  return mapHabitResponse(dto);
}

export async function updateHabit(id: string, request: SaveHabitRequest): Promise<Habit> {
  const dto = await apiRequest<HabitResponseDto>(`/habits/${id}`, { method: "PUT", body: request });
  return mapHabitResponse(dto);
}

async function versionAction(id: string, action: "archive" | "restore", version: number) {
  const dto = await apiRequest<HabitResponseDto>(`/habits/${id}/${action}`, {
    method: "POST",
    body: { version },
  });
  return mapHabitResponse(dto);
}

export const archiveHabit = (id: string, version: number) => versionAction(id, "archive", version);
export const restoreHabit = (id: string, version: number) => versionAction(id, "restore", version);

export async function listHabitEntries(
  id: string,
  from: LocalDate,
  to: LocalDate,
  signal?: AbortSignal,
): Promise<readonly HabitEntry[]> {
  const query = new URLSearchParams({ from, to });
  const dtos = await apiRequest<readonly HabitEntryResponseDto[]>(
    `/habits/${id}/entries?${query}`,
    {
      method: "GET",
      ...(signal ? { signal } : {}),
    },
  );
  return dtos.map(mapHabitEntry);
}

export async function setHabitEntry(
  id: string,
  date: LocalDate,
  count: number,
): Promise<HabitEntry> {
  const dto = await apiRequest<HabitEntryResponseDto>(`/habits/${id}/entries`, {
    method: "PUT",
    body: { date, count },
  });
  return mapHabitEntry(dto);
}

export async function removeHabitEntry(id: string, date: LocalDate): Promise<void> {
  await apiRequest<void>(`/habits/${id}/entries?${new URLSearchParams({ date })}`, {
    method: "DELETE",
  });
}

export async function getHabitStatistics(
  id: string,
  from: LocalDate,
  to: LocalDate,
  signal?: AbortSignal,
): Promise<HabitStatisticsWindow> {
  const query = new URLSearchParams({ from, to });
  const dto = await apiRequest<HabitStatsResponseDto>(`/habits/${id}/stats?${query}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapHabitStatistics(dto);
}

export async function listHabitPauses(id: string, signal?: AbortSignal) {
  const dtos = await apiRequest<readonly HabitPauseResponseDto[]>(`/habits/${id}/pauses`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return dtos.map(mapHabitPause);
}

export async function createHabitPause(id: string, request: CreateHabitPauseRequest) {
  const dto = await apiRequest<HabitPauseResponseDto>(`/habits/${id}/pauses`, {
    method: "POST",
    body: request,
  });
  return mapHabitPause(dto);
}

export async function removeHabitPause(id: string, pauseId: string): Promise<void> {
  await apiRequest<void>(`/habits/${id}/pauses/${pauseId}`, { method: "DELETE" });
}
