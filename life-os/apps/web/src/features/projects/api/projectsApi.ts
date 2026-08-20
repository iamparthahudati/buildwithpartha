import { apiRequest } from "@lib/apiClient";
import type { Project, ProjectHealth, ProjectPriority, ProjectStatus } from "../model/project";
import { mapMilestoneResponse } from "./milestonesApi";

export interface PageResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
}

/** Backend DTO representing a Project returned from API endpoints. */
export interface ProjectResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status: string;
  readonly priority: string;
  readonly health: string;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly startDate?: string | null;
  readonly deadlineDate?: string | null;
  readonly estimateMinutes?: number | null;
  readonly archivedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly labelIds: readonly string[];
  readonly version: number;
}

/** Dashboard summary counts returned alongside project query results. */
export interface ProjectSummaryCountsDto {
  readonly total: number;
  readonly active: number;
  readonly completed: number;
  readonly onHold: number;
  readonly atRisk: number;
  readonly averageProgress: number;
}

/** Paginated response wrapper returned from GET /projects. */
export interface ProjectQueryResponseDto {
  readonly page: PageResponse<ProjectResponseDto>;
  readonly summary: ProjectSummaryCountsDto;
}

/** Aggregated detail response DTO returned from GET /projects/{id}/detail. */
export interface ProjectDetailResponseDto {
  readonly project: ProjectResponseDto;
  readonly milestones: readonly import("./milestonesApi").MilestoneResponseDto[];
}

export interface ProjectDetail {
  readonly project: Project;
  readonly milestones: readonly import("../model/milestone").Milestone[];
}

/** Request DTO for POST /projects. */
export interface CreateProjectRequestDto {
  readonly name: string;
  readonly description?: string | null;
  readonly status?: string | null;
  readonly priority?: string | null;
  readonly health?: string | null;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly startDate?: string | null;
  readonly deadlineDate?: string | null;
  readonly estimateMinutes?: number | null;
  readonly labelIds?: readonly string[];
}

/** Request DTO for PUT /projects/{id}. */
export interface UpdateProjectRequestDto {
  readonly name: string;
  readonly description?: string | null;
  readonly status?: string | null;
  readonly priority?: string | null;
  readonly health?: string | null;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly startDate?: string | null;
  readonly deadlineDate?: string | null;
  readonly estimateMinutes?: number | null;
  readonly labelIds?: readonly string[];
  readonly version: number;
}

/** Request DTO for POST /projects/{id}/archive. */
export interface ArchiveProjectRequestDto {
  readonly version: number;
}

/** Request DTO for POST /projects/{id}/restore. */
export interface RestoreProjectRequestDto {
  readonly version: number;
}

/** Query parameters for searching and filtering projects. */
export interface ProjectQueryParams {
  readonly q?: string;
  readonly status?: readonly string[];
  readonly priority?: readonly string[];
  readonly health?: readonly string[];
  readonly labelId?: readonly string[];
  readonly deadlineBefore?: string;
  readonly deadlineAfter?: string;
  readonly archived?: boolean;
  readonly page?: number; // 0-indexed
  readonly size?: number;
  readonly sortBy?: string;
  readonly sortDirection?: "ASC" | "DESC";
}

/** Maps a ProjectResponseDto into the frontend Project domain model. */
export function mapProjectResponse(dto: ProjectResponseDto): Project {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? null,
    status: dto.status as ProjectStatus,
    priority: dto.priority as ProjectPriority,
    health: dto.health as ProjectHealth,
    color: dto.color ?? null,
    icon: dto.icon ?? null,
    startDate: dto.startDate ?? null,
    deadlineDate: dto.deadlineDate ?? null,
    completedTasksCount:
      ((dto as unknown as Record<string, unknown>).completedTasksCount as number) ?? 0,
    totalTasksCount: ((dto as unknown as Record<string, unknown>).totalTasksCount as number) ?? 0,
    archivedAt: dto.archivedAt ?? null,
    updatedAt: dto.updatedAt,
    version: dto.version,
  };
}

/** Queries projects list and summary counts from backend REST endpoint. */
export async function queryProjects(
  params: ProjectQueryParams = {},
  signal?: AbortSignal,
): Promise<{
  readonly items: readonly Project[];
  readonly page: PageResponse<ProjectResponseDto>;
  readonly summary: ProjectSummaryCountsDto;
}> {
  const searchParams = new URLSearchParams();

  if (params.q && params.q.trim() !== "") {
    searchParams.set("q", params.q.trim());
  }

  if (params.status && params.status.length > 0) {
    params.status.forEach((st) => searchParams.append("status", st));
  }

  if (params.priority && params.priority.length > 0) {
    params.priority.forEach((pr) => searchParams.append("priority", pr));
  }

  if (params.health && params.health.length > 0) {
    params.health.forEach((h) => searchParams.append("health", h));
  }

  if (params.labelId && params.labelId.length > 0) {
    params.labelId.forEach((l) => searchParams.append("labelId", l));
  }

  if (params.deadlineBefore) {
    searchParams.set("deadlineBefore", params.deadlineBefore);
  }

  if (params.deadlineAfter) {
    searchParams.set("deadlineAfter", params.deadlineAfter);
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
  const path = `/projects${queryString ? `?${queryString}` : ""}`;

  const response = await apiRequest<ProjectQueryResponseDto>(path, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });

  return {
    items: response.page.items.map(mapProjectResponse),
    page: response.page,
    summary: response.summary,
  };
}

/** Fetches a single project by ID. */
export async function getProject(id: string, signal?: AbortSignal): Promise<Project> {
  const dto = await apiRequest<ProjectResponseDto>(`/projects/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapProjectResponse(dto);
}

/** Fetches aggregated project details and milestones by project ID. */
export async function getProjectDetail(id: string, signal?: AbortSignal): Promise<ProjectDetail> {
  const dto = await apiRequest<ProjectDetailResponseDto>(`/projects/${id}/detail`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return {
    project: mapProjectResponse(dto.project),
    milestones: dto.milestones.map(mapMilestoneResponse),
  };
}

/** Creates a new project. */
export async function createProject(request: CreateProjectRequestDto): Promise<Project> {
  const dto = await apiRequest<ProjectResponseDto>("/projects", {
    method: "POST",
    body: request,
  });
  return mapProjectResponse(dto);
}

/** Updates an existing project. */
export async function updateProject(
  id: string,
  request: UpdateProjectRequestDto,
): Promise<Project> {
  const dto = await apiRequest<ProjectResponseDto>(`/projects/${id}`, {
    method: "PUT",
    body: request,
  });
  return mapProjectResponse(dto);
}

/** Archives an active project. */
export async function archiveProject(
  id: string,
  request: ArchiveProjectRequestDto,
): Promise<Project> {
  const dto = await apiRequest<ProjectResponseDto>(`/projects/${id}/archive`, {
    method: "POST",
    body: request,
  });
  return mapProjectResponse(dto);
}

/** Restores an archived project. */
export async function restoreProject(
  id: string,
  request: RestoreProjectRequestDto,
): Promise<Project> {
  const dto = await apiRequest<ProjectResponseDto>(`/projects/${id}/restore`, {
    method: "POST",
    body: request,
  });
  return mapProjectResponse(dto);
}

/** Permanently deletes a project by ID. */
export async function deleteProject(id: string): Promise<void> {
  await apiRequest<void>(`/projects/${id}`, {
    method: "DELETE",
  });
}
