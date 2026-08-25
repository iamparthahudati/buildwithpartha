import { apiRequest } from "@lib/apiClient";
import type { LocalDate } from "@lib/localDateTime";

import type {
  ScopeChangeType,
  Sprint,
  SprintScopeChangeEvent,
  SprintStatus,
  SprintTask,
  TaskPriority,
  TaskStatus,
} from "../model/sprint";

export interface SprintTaskResponseDto {
  readonly id: string;
  readonly taskId: string;
  readonly storyPoints: number;
  readonly position: number;
  readonly addedAfterStart: boolean;
  readonly committedAt: string;
  readonly removedAt?: string | null;
  readonly carriedOverToSprintId?: string | null;
}

export interface SprintEventResponseDto {
  readonly id: string;
  readonly eventType: string;
  readonly taskId?: string | null;
  readonly pointsDelta?: number | null;
  readonly reason?: string | null;
  readonly occurredAt: string;
}

export interface SprintResponseDto {
  readonly id: string;
  readonly name: string;
  readonly goal?: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: SprintStatus;
  readonly targetCapacityPoints: number;
  readonly committedTaskCount: number;
  readonly completedTaskCount: number;
  readonly addedTaskCount: number;
  readonly removedTaskCount: number;
  readonly carriedOverTaskCount: number;
  readonly totalStoryPoints: number;
  readonly completedStoryPoints: number;
  readonly retrospectiveNotes?: string | null;
  readonly whatWentWell?: string | null;
  readonly whatCouldBeImproved?: string | null;
  readonly actionItems: readonly string[];
  readonly completedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly tasks: readonly SprintTaskResponseDto[];
  readonly events: readonly SprintEventResponseDto[];
  readonly version: number;
}

export interface SprintTaskContext {
  readonly id: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority?: TaskPriority;
  readonly projectName?: string;
}

export interface CreateSprintRequestDto {
  readonly name: string;
  readonly goal?: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly targetCapacityPoints: number;
  readonly tasks?: readonly {
    readonly taskId: string;
    readonly storyPoints: number;
    readonly position: number;
  }[];
}

export interface UpdateSprintRequestDto {
  readonly name: string;
  readonly goal?: string | null;
  readonly startDate: string;
  readonly endDate: string;
  readonly targetCapacityPoints: number;
  readonly version: number;
}

export interface AddSprintTaskRequestDto {
  readonly taskId: string;
  readonly storyPoints: number;
  readonly position: number;
  readonly reason?: string | null;
  readonly version: number;
}

export interface UpdateSprintTaskRequestDto {
  readonly storyPoints: number;
  readonly position: number;
  readonly reason?: string | null;
  readonly version: number;
}

export interface RemoveSprintTaskRequestDto {
  readonly reason?: string | null;
  readonly version: number;
}

export interface CompleteSprintRequestDto {
  readonly retrospectiveNotes?: string | null;
  readonly whatWentWell?: string | null;
  readonly whatCouldBeImproved?: string | null;
  readonly actionItems?: readonly string[];
  readonly carryOverDestination: "NEXT_SPRINT" | "BACKLOG";
  readonly targetSprintId?: string | null;
  readonly targetVersion?: number | null;
  readonly version: number;
}

const SCOPE_EVENT_TYPES = new Set<ScopeChangeType>([
  "TASK_ADDED",
  "TASK_REMOVED",
  "POINTS_CHANGED",
  "CAPACITY_CHANGED",
]);

/**
 * Resolves the API's canonical commitment IDs against current Task data. Active/planned totals are
 * calculated from current Task status; completed Sprints keep the API's immutable snapshot.
 */
export function mapSprintResponse(
  dto: SprintResponseDto,
  taskById: ReadonlyMap<string, SprintTaskContext> = new Map(),
): {
  readonly sprint: Sprint;
  readonly tasks: readonly SprintTask[];
  readonly events: readonly SprintScopeChangeEvent[];
} {
  const tasks = dto.tasks
    .filter((task) => task.removedAt == null)
    .sort((left, right) => left.position - right.position)
    .map((task): SprintTask => {
      const context = taskById.get(task.taskId);
      return {
        id: task.id,
        sprintId: dto.id,
        taskId: task.taskId,
        title: context?.title ?? "Task unavailable",
        status: context?.status ?? null,
        storyPoints: task.storyPoints,
        ...(context?.projectName ? { projectName: context.projectName } : {}),
        ...(context?.priority ? { priority: context.priority } : {}),
        isCommitted: !task.addedAfterStart,
        addedAt: task.committedAt,
        ...(task.removedAt ? { removedAt: task.removedAt } : {}),
        ...(task.carriedOverToSprintId
          ? { carriedOverToSprintId: task.carriedOverToSprintId }
          : {}),
      };
    });

  const liveTotalPoints = tasks.reduce((sum, task) => sum + task.storyPoints, 0);
  const liveCompletedPoints = tasks
    .filter((task) => task.status === "DONE")
    .reduce((sum, task) => sum + task.storyPoints, 0);
  const completed = dto.status === "COMPLETED";

  const events = dto.events.flatMap((event): readonly SprintScopeChangeEvent[] => {
    if (!SCOPE_EVENT_TYPES.has(event.eventType as ScopeChangeType)) {
      return [];
    }
    const taskContext = event.taskId ? taskById.get(event.taskId) : undefined;
    return [
      {
        id: event.id,
        sprintId: dto.id,
        changeType: event.eventType as ScopeChangeType,
        ...(event.taskId ? { taskId: event.taskId } : {}),
        ...(taskContext ? { taskTitle: taskContext.title } : {}),
        ...(event.pointsDelta != null ? { pointsDelta: event.pointsDelta } : {}),
        ...(event.reason ? { reason: event.reason } : {}),
        timestamp: event.occurredAt,
      },
    ];
  });

  return {
    sprint: {
      id: dto.id,
      name: dto.name,
      ...(dto.goal ? { goal: dto.goal } : {}),
      startDate: dto.startDate as LocalDate,
      endDate: dto.endDate as LocalDate,
      status: dto.status,
      targetCapacityPoints: dto.targetCapacityPoints,
      completedStoryPoints: completed ? dto.completedStoryPoints : liveCompletedPoints,
      totalStoryPoints: completed ? dto.totalStoryPoints : liveTotalPoints,
      ...(dto.retrospectiveNotes ? { retrospectiveNotes: dto.retrospectiveNotes } : {}),
      ...(dto.whatWentWell ? { whatWentWell: dto.whatWentWell } : {}),
      ...(dto.whatCouldBeImproved ? { whatCouldBeImproved: dto.whatCouldBeImproved } : {}),
      actionItems: dto.actionItems,
      ...(dto.completedAt ? { completedAt: dto.completedAt } : {}),
      committedTaskCount: dto.committedTaskCount,
      completedTaskCount: completed
        ? dto.completedTaskCount
        : tasks.filter((task) => task.status === "DONE").length,
      addedTaskCount: dto.addedTaskCount,
      removedTaskCount: dto.removedTaskCount,
      carriedOverTaskCount: dto.carriedOverTaskCount,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      version: dto.version,
    },
    tasks,
    events,
  };
}

export async function listSprints(
  statuses: readonly SprintStatus[] = [],
  signal?: AbortSignal,
): Promise<readonly SprintResponseDto[]> {
  const params = new URLSearchParams();
  if (statuses.length > 0) params.set("status", statuses.join(","));
  const query = params.toString();
  return apiRequest<readonly SprintResponseDto[]>(`/sprints${query ? `?${query}` : ""}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
}

export function getSprint(id: string, signal?: AbortSignal): Promise<SprintResponseDto> {
  return apiRequest<SprintResponseDto>(`/sprints/${id}`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
}

export function createSprint(request: CreateSprintRequestDto): Promise<SprintResponseDto> {
  return apiRequest<SprintResponseDto>("/sprints", { method: "POST", body: request });
}

export function updateSprint(
  id: string,
  request: UpdateSprintRequestDto,
): Promise<SprintResponseDto> {
  return apiRequest<SprintResponseDto>(`/sprints/${id}`, { method: "PUT", body: request });
}

export function addSprintTask(
  id: string,
  request: AddSprintTaskRequestDto,
): Promise<SprintResponseDto> {
  return apiRequest<SprintResponseDto>(`/sprints/${id}/tasks`, {
    method: "POST",
    body: request,
  });
}

export function updateSprintTask(
  id: string,
  taskId: string,
  request: UpdateSprintTaskRequestDto,
): Promise<SprintResponseDto> {
  return apiRequest<SprintResponseDto>(`/sprints/${id}/tasks/${taskId}`, {
    method: "PUT",
    body: request,
  });
}

export function removeSprintTask(
  id: string,
  taskId: string,
  request: RemoveSprintTaskRequestDto,
): Promise<SprintResponseDto> {
  return apiRequest<SprintResponseDto>(`/sprints/${id}/tasks/${taskId}/remove`, {
    method: "POST",
    body: request,
  });
}

export function startSprint(id: string, version: number): Promise<SprintResponseDto> {
  return apiRequest<SprintResponseDto>(`/sprints/${id}/start`, {
    method: "POST",
    body: { version },
  });
}

export function completeSprint(
  id: string,
  request: CompleteSprintRequestDto,
): Promise<SprintResponseDto> {
  return apiRequest<SprintResponseDto>(`/sprints/${id}/complete`, {
    method: "POST",
    body: request,
  });
}
