import { apiRequest } from "@lib/apiClient";
import type { Milestone, MilestoneStatus } from "../model/milestone";

/** Backend DTO representing a Milestone returned from API endpoints. */
export interface MilestoneResponseDto {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly date?: string | null;
  readonly status: string;
  readonly ordering: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

/** Request DTO for POST /projects/{projectId}/milestones. */
export interface CreateMilestoneRequestDto {
  readonly title: string;
  readonly date?: string | null;
  readonly status?: string | null;
  readonly ordering?: number;
}

/** Request DTO for PUT /projects/{projectId}/milestones/{milestoneId}. */
export interface UpdateMilestoneRequestDto {
  readonly title: string;
  readonly date?: string | null;
  readonly status?: string | null;
  readonly ordering?: number;
  readonly version: number;
}

/** Request DTO for PUT /projects/{projectId}/milestones/{milestoneId}/status. */
export interface UpdateMilestoneStatusRequestDto {
  readonly status: string;
  readonly version: number;
}

/** Maps a MilestoneResponseDto to the frontend Milestone domain model. */
export function mapMilestoneResponse(dto: MilestoneResponseDto): Milestone {
  return {
    id: dto.id,
    projectId: dto.projectId,
    title: dto.title,
    date: dto.date ?? null,
    status: dto.status as MilestoneStatus,
    ordering: dto.ordering,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version,
  };
}

/** Fetches all milestones for a project. */
export async function getMilestones(
  projectId: string,
  signal?: AbortSignal,
): Promise<readonly Milestone[]> {
  const dtos = await apiRequest<readonly MilestoneResponseDto[]>(
    `/projects/${projectId}/milestones`,
    {
      method: "GET",
      ...(signal ? { signal } : {}),
    },
  );
  return dtos.map(mapMilestoneResponse);
}

/** Creates a new milestone for a project. */
export async function createMilestone(
  projectId: string,
  request: CreateMilestoneRequestDto,
): Promise<Milestone> {
  const dto = await apiRequest<MilestoneResponseDto>(`/projects/${projectId}/milestones`, {
    method: "POST",
    body: request,
  });
  return mapMilestoneResponse(dto);
}

/** Updates an existing milestone. */
export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  request: UpdateMilestoneRequestDto,
): Promise<Milestone> {
  const dto = await apiRequest<MilestoneResponseDto>(
    `/projects/${projectId}/milestones/${milestoneId}`,
    {
      method: "PUT",
      body: request,
    },
  );
  return mapMilestoneResponse(dto);
}

/** Updates only the status of a milestone. */
export async function updateMilestoneStatus(
  projectId: string,
  milestoneId: string,
  request: UpdateMilestoneStatusRequestDto,
): Promise<Milestone> {
  const dto = await apiRequest<MilestoneResponseDto>(
    `/projects/${projectId}/milestones/${milestoneId}/status`,
    {
      method: "PUT",
      body: request,
    },
  );
  return mapMilestoneResponse(dto);
}

/** Deletes a milestone by ID. */
export async function deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
  await apiRequest<void>(`/projects/${projectId}/milestones/${milestoneId}`, {
    method: "DELETE",
  });
}
