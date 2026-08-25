import { apiRequest } from "@lib/apiClient";
import type {
  Goal,
  GoalCheckIn,
  GoalDetail,
  GoalLink,
  GoalSummaryCounts,
  GoalStatus,
  GoalProgressType,
  CheckInCadence,
  GoalLinkTargetType,
} from "../model/goal";

export interface PageResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
}

export interface GoalResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly description?: string | null;
  readonly category: string;
  readonly progressType: string;
  readonly targetValue?: number | null;
  readonly currentValue: number;
  readonly unit?: string | null;
  readonly targetDate?: string | null;
  readonly status: string;
  readonly checkInCadence: string;
  readonly archived: boolean;
  readonly progressPercentage: number;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly version?: number;
}

export interface GoalSummaryCountsDto {
  readonly totalGoals: number;
  readonly activeGoals: number;
  readonly completedGoals: number;
  readonly pausedGoals: number;
  readonly archivedGoals: number;
  readonly averageProgressPercentage: number;
}

export interface GoalQueryResponseDto {
  readonly page: PageResponse<GoalResponseDto>;
  readonly summary: GoalSummaryCountsDto;
}

export interface GoalCheckInResponseDto {
  readonly id: string;
  readonly goalId: string;
  readonly userId: string;
  readonly value: number;
  readonly note?: string | null;
  readonly recordedAt: string;
  readonly createdAt?: string | null;
}

export interface GoalLinkResponseDto {
  readonly id: string;
  readonly goalId: string;
  readonly userId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly targetTitle?: string | null;
  readonly targetStatus?: string | null;
  readonly createdAt?: string | null;
}

export interface GoalDetailResponseDto {
  readonly goal: GoalResponseDto;
  readonly progressPercentage: number;
  readonly checkIns: readonly GoalCheckInResponseDto[];
  readonly links: readonly GoalLinkResponseDto[];
}

export interface CreateGoalRequestDto {
  readonly title: string;
  readonly description?: string | null;
  readonly category: string;
  readonly progressType?: string | null;
  readonly targetValue?: number | null;
  readonly currentValue?: number | null;
  readonly unit?: string | null;
  readonly targetDate?: string | null;
  readonly status?: string | null;
  readonly checkInCadence?: string | null;
}

export interface UpdateGoalRequestDto {
  readonly title: string;
  readonly description?: string | null;
  readonly category: string;
  readonly progressType?: string | null;
  readonly targetValue?: number | null;
  readonly currentValue?: number | null;
  readonly unit?: string | null;
  readonly targetDate?: string | null;
  readonly checkInCadence?: string | null;
  readonly version: number;
}

export interface PauseGoalRequestDto {
  readonly version: number;
}

export interface CompleteGoalRequestDto {
  readonly version: number;
}

export interface ArchiveGoalRequestDto {
  readonly version: number;
}

export interface RestoreGoalRequestDto {
  readonly version: number;
}

export interface AddCheckInRequestDto {
  readonly value: number;
  readonly note?: string | null;
  readonly recordedAt?: string | null;
}

export interface AddGoalLinkRequestDto {
  readonly targetType: string;
  readonly targetId: string;
}

export interface GoalQueryParams {
  readonly q?: string;
  readonly status?: readonly string[];
  readonly category?: string;
  readonly progressType?: readonly string[];
  readonly archived?: boolean;
  readonly page?: number;
  readonly size?: number;
  readonly sortBy?: string;
  readonly sortDirection?: "ASC" | "DESC";
}

export function mapGoalSummary(dto: GoalSummaryCountsDto): GoalSummaryCounts {
  return {
    totalGoals: dto.totalGoals ?? 0,
    activeGoals: dto.activeGoals ?? 0,
    completedGoals: dto.completedGoals ?? 0,
    pausedGoals: dto.pausedGoals ?? 0,
    archivedGoals: dto.archivedGoals ?? 0,
    averageProgressPercentage: Number.isFinite(dto.averageProgressPercentage)
      ? dto.averageProgressPercentage
      : 0,
  };
}

export function mapGoalResponse(dto: GoalResponseDto): Goal {
  return {
    id: dto.id,
    userId: dto.userId,
    title: dto.title,
    ...(dto.description ? { description: dto.description } : {}),
    category: dto.category,
    progressType: dto.progressType as GoalProgressType,
    ...(dto.targetValue !== undefined && dto.targetValue !== null
      ? { targetValue: dto.targetValue }
      : {}),
    currentValue: dto.currentValue ?? 0,
    ...(dto.unit ? { unit: dto.unit } : {}),
    ...(dto.targetDate ? { targetDate: dto.targetDate } : {}),
    status: dto.status as GoalStatus,
    checkInCadence: dto.checkInCadence as CheckInCadence,
    archived: dto.archived ?? false,
    progressPercentage: dto.progressPercentage ?? 0,
    ...(dto.createdAt ? { createdAt: dto.createdAt } : {}),
    ...(dto.updatedAt ? { updatedAt: dto.updatedAt } : {}),
    version: dto.version ?? 1,
  };
}

export function mapGoalCheckInResponse(dto: GoalCheckInResponseDto): GoalCheckIn {
  return {
    id: dto.id,
    goalId: dto.goalId,
    userId: dto.userId,
    value: dto.value,
    ...(dto.note ? { note: dto.note } : {}),
    recordedAt: dto.recordedAt,
    ...(dto.createdAt ? { createdAt: dto.createdAt } : {}),
  };
}

export function mapGoalLinkResponse(dto: GoalLinkResponseDto): GoalLink {
  return {
    id: dto.id,
    goalId: dto.goalId,
    userId: dto.userId,
    targetType: dto.targetType as GoalLinkTargetType,
    targetId: dto.targetId,
    ...(dto.targetTitle ? { targetTitle: dto.targetTitle } : {}),
    ...(dto.targetStatus ? { targetStatus: dto.targetStatus } : {}),
    ...(dto.createdAt ? { createdAt: dto.createdAt } : {}),
  };
}

export function mapGoalDetailResponse(dto: GoalDetailResponseDto): GoalDetail {
  return {
    goal: mapGoalResponse(dto.goal),
    progressPercentage: dto.progressPercentage,
    checkIns: dto.checkIns.map(mapGoalCheckInResponse),
    links: dto.links.map(mapGoalLinkResponse),
  };
}

export async function queryGoals(
  params: GoalQueryParams = {},
  signal?: AbortSignal,
): Promise<{
  readonly items: readonly Goal[];
  readonly page: PageResponse<GoalResponseDto>;
  readonly summary: GoalSummaryCounts;
}> {
  const searchParams = new URLSearchParams();

  if (params.q && params.q.trim() !== "") {
    searchParams.set("q", params.q.trim());
  }

  if (params.status && params.status.length > 0) {
    params.status.forEach((st) => searchParams.append("status", st));
  }

  if (params.category && params.category.trim() !== "") {
    searchParams.set("category", params.category.trim());
  }

  if (params.progressType && params.progressType.length > 0) {
    params.progressType.forEach((pt) => searchParams.append("progressType", pt));
  }

  if (params.archived !== undefined) {
    searchParams.set("archived", String(params.archived));
  }

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.size !== undefined) {
    searchParams.set("size", String(params.size));
  }

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }

  if (params.sortDirection) {
    searchParams.set("sortDirection", params.sortDirection);
  }

  const queryString = searchParams.toString();
  const path = `/goals${queryString ? `?${queryString}` : ""}`;

  const response = await apiRequest<GoalQueryResponseDto>(path, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });

  return {
    items: response.page.items.map(mapGoalResponse),
    page: response.page,
    summary: mapGoalSummary(response.summary),
  };
}

export async function getGoal(id: string, signal?: AbortSignal): Promise<Goal> {
  const dto = await apiRequest<GoalResponseDto>(`/goals/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapGoalResponse(dto);
}

export async function getGoalDetail(id: string, signal?: AbortSignal): Promise<GoalDetail> {
  const dto = await apiRequest<GoalDetailResponseDto>(`/goals/${id}/detail`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapGoalDetailResponse(dto);
}

export async function createGoal(request: CreateGoalRequestDto): Promise<Goal> {
  const dto = await apiRequest<GoalResponseDto>("/goals", {
    method: "POST",
    body: request,
  });
  return mapGoalResponse(dto);
}

export async function updateGoal(id: string, request: UpdateGoalRequestDto): Promise<Goal> {
  const dto = await apiRequest<GoalResponseDto>(`/goals/${id}`, {
    method: "PUT",
    body: request,
  });
  return mapGoalResponse(dto);
}

export async function pauseGoal(id: string, request: PauseGoalRequestDto): Promise<Goal> {
  const dto = await apiRequest<GoalResponseDto>(`/goals/${id}/pause`, {
    method: "POST",
    body: request,
  });
  return mapGoalResponse(dto);
}

export async function completeGoal(id: string, request: CompleteGoalRequestDto): Promise<Goal> {
  const dto = await apiRequest<GoalResponseDto>(`/goals/${id}/complete`, {
    method: "POST",
    body: request,
  });
  return mapGoalResponse(dto);
}

export async function archiveGoal(id: string, request: ArchiveGoalRequestDto): Promise<Goal> {
  const dto = await apiRequest<GoalResponseDto>(`/goals/${id}/archive`, {
    method: "POST",
    body: request,
  });
  return mapGoalResponse(dto);
}

export async function restoreGoal(id: string, request: RestoreGoalRequestDto): Promise<Goal> {
  const dto = await apiRequest<GoalResponseDto>(`/goals/${id}/restore`, {
    method: "POST",
    body: request,
  });
  return mapGoalResponse(dto);
}

export async function deleteGoal(id: string): Promise<void> {
  await apiRequest<void>(`/goals/${id}`, {
    method: "DELETE",
  });
}

export async function recordCheckIn(
  goalId: string,
  request: AddCheckInRequestDto,
): Promise<GoalCheckIn> {
  const dto = await apiRequest<GoalCheckInResponseDto>(`/goals/${goalId}/check-ins`, {
    method: "POST",
    body: request,
  });
  return mapGoalCheckInResponse(dto);
}

export async function getCheckIns(
  goalId: string,
  page = 0,
  size = 20,
  signal?: AbortSignal,
): Promise<PageResponse<GoalCheckIn>> {
  const response = await apiRequest<PageResponse<GoalCheckInResponseDto>>(
    `/goals/${goalId}/check-ins?page=${page}&size=${size}`,
    {
      method: "GET",
      ...(signal ? { signal } : {}),
    },
  );
  return {
    ...response,
    items: response.items.map(mapGoalCheckInResponse),
  };
}

export async function deleteCheckIn(goalId: string, checkInId: string): Promise<void> {
  await apiRequest<void>(`/goals/${goalId}/check-ins/${checkInId}`, {
    method: "DELETE",
  });
}

export async function addGoalLink(
  goalId: string,
  request: AddGoalLinkRequestDto,
): Promise<GoalLink> {
  const dto = await apiRequest<GoalLinkResponseDto>(`/goals/${goalId}/links`, {
    method: "POST",
    body: request,
  });
  return mapGoalLinkResponse(dto);
}

export async function getGoalLinks(
  goalId: string,
  signal?: AbortSignal,
): Promise<readonly GoalLink[]> {
  const dtos = await apiRequest<readonly GoalLinkResponseDto[]>(`/goals/${goalId}/links`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return dtos.map(mapGoalLinkResponse);
}

export async function deleteGoalLink(goalId: string, linkId: string): Promise<void> {
  await apiRequest<void>(`/goals/${goalId}/links/${linkId}`, {
    method: "DELETE",
  });
}
