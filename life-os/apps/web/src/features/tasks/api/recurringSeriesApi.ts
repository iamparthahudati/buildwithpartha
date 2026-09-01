import { apiRequest } from "@lib/apiClient";
import type {
  RecurrenceDayOfWeek,
  RecurrenceEndMode,
  RecurrenceEditScope,
  RecurrenceFrequency,
} from "@components/forms";
import type { TaskPriority } from "../model/task";

export interface CreateRecurringSeriesRequestDto {
  readonly title: string;
  readonly description?: string | null;
  readonly priority?: TaskPriority | null;
  readonly projectId?: string | null;
  readonly estimateMinutes?: number;
  readonly frequency: RecurrenceFrequency;
  readonly intervalValue?: number;
  readonly daysOfWeek?: readonly RecurrenceDayOfWeek[] | null;
  readonly dayOfMonth?: number | null;
  readonly endMode: RecurrenceEndMode;
  readonly endDate?: string | null;
  readonly endCount?: number | null;
  readonly startDate: string;
  readonly timeZone: string;
}

export interface UpdateRecurringSeriesRequestDto extends CreateRecurringSeriesRequestDto {
  readonly scope?: RecurrenceEditScope;
  readonly occurrenceDate?: string | null;
}

export interface RecurringSeriesResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly description?: string | null;
  readonly priority: TaskPriority;
  readonly projectId?: string | null;
  readonly estimateMinutes: number;
  readonly frequency: RecurrenceFrequency;
  readonly intervalValue: number;
  readonly daysOfWeek?: readonly RecurrenceDayOfWeek[] | null;
  readonly dayOfMonth?: number | null;
  readonly endMode: RecurrenceEndMode;
  readonly endDate?: string | null;
  readonly endCount?: number | null;
  readonly startDate: string;
  readonly timeZone: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SkipOccurrenceRequestDto {
  readonly occurrenceDate: string;
  readonly reason?: string | null;
}

export interface RecurringTaskExceptionDto {
  readonly id: string;
  readonly seriesId: string;
  readonly occurrenceDate: string;
  readonly exceptionType: "SKIPPED" | "RESCHEDULED" | "DELETED" | "OVERRIDDEN";
  readonly overrideTaskId?: string | null;
  readonly rescheduledDate?: string | null;
  readonly reason?: string | null;
  readonly createdAt: string;
}

export async function createRecurringSeries(
  request: CreateRecurringSeriesRequestDto,
): Promise<RecurringSeriesResponseDto> {
  return apiRequest<RecurringSeriesResponseDto>("/tasks/recurring-series", {
    method: "POST",
    body: request,
  });
}

export async function listRecurringSeries(): Promise<readonly RecurringSeriesResponseDto[]> {
  return apiRequest<readonly RecurringSeriesResponseDto[]>("/tasks/recurring-series", {
    method: "GET",
  });
}

export async function getRecurringSeries(id: string): Promise<RecurringSeriesResponseDto> {
  return apiRequest<RecurringSeriesResponseDto>(`/tasks/recurring-series/${id}`, {
    method: "GET",
  });
}

export async function updateRecurringSeries(
  id: string,
  request: UpdateRecurringSeriesRequestDto,
): Promise<RecurringSeriesResponseDto> {
  return apiRequest<RecurringSeriesResponseDto>(`/tasks/recurring-series/${id}`, {
    method: "PUT",
    body: request,
  });
}

export async function deleteRecurringSeries(id: string): Promise<void> {
  await apiRequest<void>(`/tasks/recurring-series/${id}`, { method: "DELETE" });
}

export async function skipOccurrence(
  seriesId: string,
  request: SkipOccurrenceRequestDto,
): Promise<void> {
  await apiRequest<void>(`/tasks/recurring-series/${seriesId}/skip`, {
    method: "POST",
    body: request,
  });
}

export async function listRecurringSeriesExceptions(
  seriesId: string,
): Promise<readonly RecurringTaskExceptionDto[]> {
  return apiRequest<readonly RecurringTaskExceptionDto[]>(
    `/tasks/recurring-series/${seriesId}/exceptions`,
    { method: "GET" },
  );
}
