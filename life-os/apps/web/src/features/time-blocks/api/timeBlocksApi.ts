import { apiRequest } from "@lib/apiClient";
import {
  resolveLocalDateTime,
  todayLocalDate,
  type LocalDate,
  type LocalTime,
} from "@lib/localDateTime";
import type { TimeBlock, TimeBlockStatus } from "../model/timeBlock";

/** Backend DTO for a Time Block returned by REST endpoints. */
export interface TimeBlockResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly projectId?: string | null;
  readonly taskId?: string | null;
  readonly title: string;
  readonly category: string;
  readonly status: TimeBlockStatus;
  readonly startAt: string;
  readonly endAt: string;
  readonly sourceTimeZone: string;
  readonly notes?: string | null;
  readonly durationMinutes: number;
  readonly isOvernight: boolean;
  readonly spansDstTransition: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

/** Paginated / list response for GET /time-blocks. */
export interface TimeBlockQueryResponseDto {
  readonly timeBlocks: readonly TimeBlockResponseDto[];
  readonly totalCount: number;
}

/** Request DTO for POST /time-blocks. */
export interface CreateTimeBlockRequestDto {
  readonly title: string;
  readonly category: string;
  readonly status?: TimeBlockStatus;
  readonly startAt: string;
  readonly endAt: string;
  readonly sourceTimeZone: string;
  readonly notes?: string | null;
  readonly projectId?: string | null;
  readonly taskId?: string | null;
  readonly allowOverlap?: boolean;
}

/** Request DTO for PUT /time-blocks/{id}. */
export interface UpdateTimeBlockRequestDto {
  readonly title: string;
  readonly category: string;
  readonly status: TimeBlockStatus;
  readonly startAt: string;
  readonly endAt: string;
  readonly sourceTimeZone: string;
  readonly notes?: string | null;
  readonly projectId?: string | null;
  readonly taskId?: string | null;
  readonly version: number;
  readonly allowOverlap?: boolean;
}

/** Request DTO for PATCH /time-blocks/{id}/move. */
export interface MoveTimeBlockRequestDto {
  readonly startAt: string;
  readonly endAt: string;
  readonly version: number;
  readonly allowOverlap?: boolean;
}

/** Request DTO for PATCH /time-blocks/{id}/resize. */
export interface ResizeTimeBlockRequestDto {
  readonly startAt: string;
  readonly endAt: string;
  readonly version: number;
  readonly allowOverlap?: boolean;
}

/** Request DTO for PATCH /time-blocks/{id}/status. */
export interface ChangeTimeBlockStatusRequestDto {
  readonly status: TimeBlockStatus;
  readonly version?: number;
}

/** Request DTO for POST /time-blocks/{id}/duplicate. */
export interface DuplicateTimeBlockRequestDto {
  readonly startAt?: string | null;
  readonly endAt?: string | null;
  readonly allowOverlap?: boolean;
}

/** Request DTO for POST /time-blocks/check-overlap. */
export interface CheckOverlapRequestDto {
  readonly startAt: string;
  readonly endAt: string;
  readonly excludeId?: string | null;
}

/** Response DTO for POST /time-blocks/check-overlap. */
export interface TimeBlockOverlapResponseDto {
  readonly hasConflict: boolean;
  readonly conflictingBlocks: readonly TimeBlockResponseDto[];
}

/** Query parameters for searching and filtering time blocks. */
export interface TimeBlockQueryParams {
  readonly rangeStart?: string;
  readonly rangeEnd?: string;
  readonly date?: LocalDate;
  readonly timeZone?: string;
  readonly projectId?: string;
  readonly taskId?: string;
}

/** Converts an ISO 8601 string to a LocalDate (YYYY-MM-DD) in a target timezone. */
export function instantToLocalDate(instantIso: string, timeZone: string): LocalDate {
  return todayLocalDate(timeZone, new Date(instantIso));
}

/** Converts an ISO 8601 string to a LocalTime (HH:mm) in a target timezone. */
export function instantToLocalTime(instantIso: string, timeZone: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instantIso));

  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Converts a LocalDate (YYYY-MM-DD) and LocalTime (HH:mm) in a timezone to an ISO 8601 string. */
export function localDateTimeToInstantIso(
  date: LocalDate,
  time: LocalTime,
  timeZone: string,
): string {
  const res = resolveLocalDateTime(date, time, timeZone);
  if (res.kind === "nonexistent") {
    throw new Error(`Invalid local time ${time} on ${date} in ${timeZone} due to DST transition.`);
  }
  return new Date(res.instantMs).toISOString();
}

/** Maps a TimeBlockResponseDto into the frontend TimeBlock domain model. */
export function mapTimeBlockResponse(
  dto: TimeBlockResponseDto,
  targetTimeZone?: string,
): TimeBlock {
  const tz = targetTimeZone ?? dto.sourceTimeZone ?? "UTC";
  const date = instantToLocalDate(dto.startAt, tz);
  const startTime = instantToLocalTime(dto.startAt, tz);
  const endTime = instantToLocalTime(dto.endAt, tz);

  return {
    id: dto.id,
    title: dto.title,
    category: dto.category,
    status: dto.status,
    completed: dto.status === "COMPLETED",
    date,
    startTime,
    endTime,
    timeZone: dto.sourceTimeZone,
    notes: dto.notes ?? null,
    projectId: dto.projectId ?? null,
    taskId: dto.taskId ?? null,
    project: dto.projectId
      ? { id: dto.projectId, name: "Project", href: `/life-os/app/projects/${dto.projectId}` }
      : null,
    task: dto.taskId
      ? { id: dto.taskId, title: "Task", href: `/life-os/app/tasks/${dto.taskId}` }
      : null,
    version: dto.version,
  } as TimeBlock & { version: number };
}

/** Queries time blocks by range, date, timezone, project, or task. */
export async function queryTimeBlocks(
  params: TimeBlockQueryParams = {},
  signal?: AbortSignal,
): Promise<{ readonly items: readonly TimeBlock[]; readonly totalCount: number }> {
  const searchParams = new URLSearchParams();

  if (params.rangeStart) searchParams.set("rangeStart", params.rangeStart);
  if (params.rangeEnd) searchParams.set("rangeEnd", params.rangeEnd);
  if (params.date) searchParams.set("date", params.date);
  if (params.timeZone) searchParams.set("timeZone", params.timeZone);
  if (params.projectId) searchParams.set("projectId", params.projectId);
  if (params.taskId) searchParams.set("taskId", params.taskId);

  const queryString = searchParams.toString();
  const path = `/time-blocks${queryString ? `?${queryString}` : ""}`;

  const response = await apiRequest<TimeBlockQueryResponseDto>(path, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });

  return {
    items: response.timeBlocks.map((b) => mapTimeBlockResponse(b, params.timeZone)),
    totalCount: response.totalCount,
  };
}

/** Fetches a single time block by ID. */
export async function getTimeBlock(id: string, signal?: AbortSignal): Promise<TimeBlock> {
  const dto = await apiRequest<TimeBlockResponseDto>(`/time-blocks/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapTimeBlockResponse(dto);
}

/** Creates a new time block. */
export async function createTimeBlock(request: CreateTimeBlockRequestDto): Promise<TimeBlock> {
  const dto = await apiRequest<TimeBlockResponseDto>("/time-blocks", {
    method: "POST",
    body: request,
  });
  return mapTimeBlockResponse(dto);
}

/** Updates an existing time block. */
export async function updateTimeBlock(
  id: string,
  request: UpdateTimeBlockRequestDto,
): Promise<TimeBlock> {
  const dto = await apiRequest<TimeBlockResponseDto>(`/time-blocks/${id}`, {
    method: "PUT",
    body: request,
  });
  return mapTimeBlockResponse(dto);
}

/** Moves a time block start and end times. */
export async function moveTimeBlock(
  id: string,
  request: MoveTimeBlockRequestDto,
): Promise<TimeBlock> {
  const dto = await apiRequest<TimeBlockResponseDto>(`/time-blocks/${id}/move`, {
    method: "PATCH",
    body: request,
  });
  return mapTimeBlockResponse(dto);
}

/** Resizes a time block start and end times. */
export async function resizeTimeBlock(
  id: string,
  request: ResizeTimeBlockRequestDto,
): Promise<TimeBlock> {
  const dto = await apiRequest<TimeBlockResponseDto>(`/time-blocks/${id}/resize`, {
    method: "PATCH",
    body: request,
  });
  return mapTimeBlockResponse(dto);
}

/** Changes time block status. */
export async function changeTimeBlockStatus(
  id: string,
  request: ChangeTimeBlockStatusRequestDto,
): Promise<TimeBlock> {
  const dto = await apiRequest<TimeBlockResponseDto>(`/time-blocks/${id}/status`, {
    method: "PATCH",
    body: request,
  });
  return mapTimeBlockResponse(dto);
}

/** Marks a time block as COMPLETED. */
export async function completeTimeBlock(id: string, version?: number): Promise<TimeBlock> {
  const queryParam = version !== undefined ? `?version=${version}` : "";
  const dto = await apiRequest<TimeBlockResponseDto>(`/time-blocks/${id}/complete${queryParam}`, {
    method: "POST",
  });
  return mapTimeBlockResponse(dto);
}

/** Duplicates an existing time block. */
export async function duplicateTimeBlock(
  id: string,
  request?: DuplicateTimeBlockRequestDto,
): Promise<TimeBlock> {
  const dto = await apiRequest<TimeBlockResponseDto>(`/time-blocks/${id}/duplicate`, {
    method: "POST",
    body: request ?? {},
  });
  return mapTimeBlockResponse(dto);
}

/** Permanently deletes a time block by ID. */
export async function deleteTimeBlock(id: string): Promise<void> {
  await apiRequest<void>(`/time-blocks/${id}`, {
    method: "DELETE",
  });
}

/** Preflight check for overlapping time blocks. */
export async function checkTimeBlockOverlap(
  request: CheckOverlapRequestDto,
): Promise<TimeBlockOverlapResponseDto> {
  return apiRequest<TimeBlockOverlapResponseDto>("/time-blocks/check-overlap", {
    method: "POST",
    body: request,
  });
}
