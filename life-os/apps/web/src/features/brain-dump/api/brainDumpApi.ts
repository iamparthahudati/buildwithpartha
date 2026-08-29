import { apiRequest } from "@lib/apiClient";
import type {
  BrainDumpConvertTargetType,
  BrainDumpItem,
  BrainDumpPageResponse,
} from "../model/brainDumpItem";

export interface BrainDumpItemResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly content: string;
  readonly status: string;
  readonly archived?: boolean;
  readonly version: number;
  readonly convertedToType?: string | null;
  readonly convertedToId?: string | null;
  readonly convertedAt?: string | null;
  readonly archivedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BrainDumpQueryParams {
  readonly q?: string;
  readonly status?: string;
  readonly archived?: boolean;
  readonly page?: number;
  readonly size?: number;
  readonly sortBy?: string;
  readonly sortDirection?: "ASC" | "DESC";
}

export interface CaptureBrainDumpRequestDto {
  readonly content: string;
}

export interface UpdateBrainDumpContentRequestDto {
  readonly content: string;
  readonly version: number;
}

export interface ConvertToTaskRequestDto {
  readonly title: string;
  readonly description?: string;
  readonly projectId?: string;
  readonly dueAt?: string;
  readonly priority: string;
  readonly labelIds?: readonly string[];
  readonly version: number;
}

export interface ConvertToNoteRequestDto {
  readonly title: string;
  readonly body: string;
  readonly labelIds?: readonly string[];
  readonly version: number;
}

export interface ConvertToProjectRequestDto {
  readonly name: string;
  readonly description?: string;
  readonly startDate?: string;
  readonly deadlineDate?: string;
  readonly priority: string;
  readonly color?: string;
  readonly icon?: string;
  readonly labelIds?: readonly string[];
  readonly version: number;
}

export interface ConvertToGoalRequestDto {
  readonly title: string;
  readonly description?: string;
  readonly category: string;
  readonly progressType: string;
  readonly targetValue?: number;
  readonly targetDate?: string;
  readonly checkInCadence: string;
  readonly version: number;
}

export function mapBrainDumpItemDto(dto: BrainDumpItemResponseDto): BrainDumpItem {
  const archivedAt = dto.archivedAt ?? null;
  return {
    id: dto.id,
    userId: dto.userId,
    content: dto.content,
    status: dto.status as BrainDumpItem["status"],
    archived: dto.archived ?? archivedAt !== null,
    version: dto.version,
    convertedToType: (dto.convertedToType ?? null) as BrainDumpConvertTargetType | null,
    convertedToId: dto.convertedToId ?? null,
    convertedAt: dto.convertedAt ?? null,
    archivedAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export async function queryBrainDumpItems(
  params: BrainDumpQueryParams = {},
  signal?: AbortSignal,
): Promise<BrainDumpPageResponse<BrainDumpItem>> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.archived !== undefined) query.set("archived", String(params.archived));
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  if (params.sortBy !== undefined) query.set("sortBy", params.sortBy);
  if (params.sortDirection !== undefined) query.set("sortDirection", params.sortDirection);

  const queryString = query.toString();
  const path = `/brain-dump-items${queryString ? `?${queryString}` : ""}`;

  const response = await apiRequest<{
    readonly items: readonly BrainDumpItemResponseDto[];
    readonly page: number;
    readonly size: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }>(path, { method: "GET", ...(signal ? { signal } : {}) });

  return {
    items: response.items.map(mapBrainDumpItemDto),
    page: response.page,
    size: response.size,
    totalItems: response.totalItems,
    totalPages: response.totalPages,
  };
}

export async function getBrainDumpItem(id: string, signal?: AbortSignal): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(`/brain-dump-items/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapBrainDumpItemDto(dto);
}

export async function captureBrainDumpItem(
  request: CaptureBrainDumpRequestDto,
): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>("/brain-dump-items", {
    method: "POST",
    body: request,
  });
  return mapBrainDumpItemDto(dto);
}

export async function updateBrainDumpContent(
  id: string,
  request: UpdateBrainDumpContentRequestDto,
): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(`/brain-dump-items/${id}`, {
    method: "PUT",
    body: request,
  });
  return mapBrainDumpItemDto(dto);
}

export async function deferBrainDumpItem(id: string, version: number): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(`/brain-dump-items/${id}/defer`, {
    method: "POST",
    body: { version },
  });
  return mapBrainDumpItemDto(dto);
}

export async function archiveBrainDumpItem(id: string, version: number): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(`/brain-dump-items/${id}/archive`, {
    method: "POST",
    body: { version },
  });
  return mapBrainDumpItemDto(dto);
}

export async function restoreBrainDumpItem(id: string, version: number): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(`/brain-dump-items/${id}/restore`, {
    method: "POST",
    body: { version },
  });
  return mapBrainDumpItemDto(dto);
}

export async function deleteBrainDumpItem(id: string): Promise<void> {
  await apiRequest<void>(`/brain-dump-items/${id}`, { method: "DELETE" });
}

export async function convertBrainDumpToTask(
  id: string,
  request: ConvertToTaskRequestDto,
): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(`/brain-dump-items/${id}/convert/task`, {
    method: "POST",
    body: request,
  });
  return mapBrainDumpItemDto(dto);
}

export async function convertBrainDumpToNote(
  id: string,
  request: ConvertToNoteRequestDto,
): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(`/brain-dump-items/${id}/convert/note`, {
    method: "POST",
    body: request,
  });
  return mapBrainDumpItemDto(dto);
}

export async function convertBrainDumpToProject(
  id: string,
  request: ConvertToProjectRequestDto,
): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(
    `/brain-dump-items/${id}/convert/project`,
    { method: "POST", body: request },
  );
  return mapBrainDumpItemDto(dto);
}

export async function convertBrainDumpToGoal(
  id: string,
  request: ConvertToGoalRequestDto,
): Promise<BrainDumpItem> {
  const dto = await apiRequest<BrainDumpItemResponseDto>(`/brain-dump-items/${id}/convert/goal`, {
    method: "POST",
    body: request,
  });
  return mapBrainDumpItemDto(dto);
}

export type ConvertBrainDumpRequest =
  | { readonly target: "TASK"; readonly request: ConvertToTaskRequestDto }
  | { readonly target: "NOTE"; readonly request: ConvertToNoteRequestDto }
  | { readonly target: "PROJECT"; readonly request: ConvertToProjectRequestDto }
  | { readonly target: "GOAL"; readonly request: ConvertToGoalRequestDto };

/**
 * Dispatches to the correct convert endpoint for a destination type. The
 * backend conversion is idempotent (LOS-1204): if the item is already
 * converted it returns the existing entity, so a retry after a timeout never
 * creates a duplicate.
 */
export function convertBrainDumpByTarget(
  id: string,
  payload: ConvertBrainDumpRequest,
): Promise<BrainDumpItem> {
  switch (payload.target) {
    case "TASK":
      return convertBrainDumpToTask(id, payload.request);
    case "NOTE":
      return convertBrainDumpToNote(id, payload.request);
    case "PROJECT":
      return convertBrainDumpToProject(id, payload.request);
    case "GOAL":
      return convertBrainDumpToGoal(id, payload.request);
    default: {
      const exhaustive: never = payload;
      throw new Error(`Unsupported conversion target: ${JSON.stringify(exhaustive)}`);
    }
  }
}
