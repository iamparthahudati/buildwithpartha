import { apiRequest } from "@lib/apiClient";

import type { TaskFormLabelOption } from "../components/TaskForm";
import type { TaskPriority, TaskProjectContext, TaskRecord, TaskStatus } from "../model/task";
import type { BulkActionOutcome, BulkTaskAction } from "../model/taskScreen";
import type { TaskSummaryCounts } from "../components/TaskSummaryMetrics";

export interface TaskPageResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface TaskResponseDto {
  readonly id: string;
  readonly userId: string;
  readonly projectId?: string | null;
  readonly title: string;
  readonly description?: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueAt?: string | null;
  readonly estimateMinutes?: number | null;
  readonly spentMinutes?: number | null;
  readonly progress: number;
  readonly mitDate?: string | null;
  readonly position?: number;
  readonly overdue: boolean;
  readonly archived: boolean;
  readonly deleted?: boolean;
  readonly archivedAt?: string | null;
  readonly deletedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly subtaskCount?: number;
  readonly completedSubtaskCount?: number;
  readonly labelIds?: readonly string[];
  readonly version: number;
}

export interface TaskSummaryCountsDto {
  readonly total: number;
  readonly toDo: number;
  readonly inProgress: number;
  readonly blocked: number;
  readonly done: number;
  readonly cancelled: number;
  readonly overdue: number;
  readonly mit: number;
}

export interface TaskQueryResponseDto {
  readonly page: TaskPageResponse<TaskResponseDto>;
  readonly summary: TaskSummaryCountsDto;
}

export interface LabelResponseDto {
  readonly id: string;
  readonly name: string;
  readonly color?: string;
}

export interface CreateTaskRequestDto {
  readonly projectId?: string | null;
  readonly title: string;
  readonly description?: string | null;
  readonly status?: string | null;
  readonly priority?: string | null;
  readonly dueAt?: string | null;
  readonly estimateMinutes?: number | null;
  readonly progress?: number | null;
  readonly mitDate?: string | null;
  readonly labelIds?: readonly string[];
}

export interface UpdateTaskRequestDto extends CreateTaskRequestDto {
  readonly version: number;
}

export interface VersionedTaskRequestDto {
  readonly version: number;
}

export interface SetMitRequestDto {
  readonly date: string;
}

export interface BulkTaskActionRequestDto {
  readonly taskIds: readonly string[];
  readonly action: string;
  readonly status?: string;
  readonly priority?: string;
  readonly projectId?: string;
  readonly labelId?: string;
  readonly dueAt?: string;
}

export interface BulkTaskItemResponseDto {
  readonly taskId: string;
  readonly outcome: "SUCCEEDED" | "FAILED";
  readonly task?: TaskResponseDto | null;
  readonly errorCode?: string | null;
}

export interface BulkTaskActionResponseDto {
  readonly requested: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly BulkTaskItemResponseDto[];
}

export interface TaskQueryParams {
  readonly q?: string;
  readonly projectId?: string;
  readonly status?: readonly string[];
  readonly priority?: readonly string[];
  readonly overdue?: boolean;
  readonly archived?: boolean;
  readonly labelId?: readonly string[];
  readonly dueBefore?: string;
  readonly dueAfter?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sortBy?: string;
  readonly sortDirection?: "ASC" | "DESC";
}

export interface TaskQueryResult {
  readonly items: readonly TaskRecord[];
  readonly page: TaskPageResponse<TaskResponseDto>;
  readonly summary: TaskSummaryCounts;
}

export function mapTaskSummary(dto: TaskSummaryCountsDto): TaskSummaryCounts {
  return {
    total: dto.total,
    toDo: dto.toDo,
    inProgress: dto.inProgress,
    done: dto.done,
    blocked: dto.blocked,
    overdue: dto.overdue,
  };
}

export function mapTaskResponse(
  dto: TaskResponseDto,
  projectById: ReadonlyMap<string, TaskProjectContext> = new Map(),
): TaskRecord {
  const projectId = dto.projectId ?? null;
  const project = projectId
    ? (projectById.get(projectId) ?? {
        id: projectId,
        name: "Project",
        href: `/life-os/app/projects/${projectId}`,
      })
    : null;

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? null,
    status: dto.status,
    priority: dto.priority,
    project,
    dueAt: dto.dueAt ?? null,
    estimateMinutes: dto.estimateMinutes ?? null,
    progress: dto.progress,
    mitDate: dto.mitDate ?? null,
    isMit: dto.mitDate != null,
    commentCount: 0,
    blockerCount: 0,
    overdue: dto.overdue,
    archivedAt: dto.archivedAt ?? (dto.archived ? dto.updatedAt : null),
    labelIds: dto.labelIds ?? [],
    version: dto.version,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    href: `/life-os/app/tasks/${dto.id}`,
  };
}

export async function queryTasks(
  params: TaskQueryParams = {},
  signal?: AbortSignal,
  projectById?: ReadonlyMap<string, TaskProjectContext>,
): Promise<TaskQueryResult> {
  const searchParams = new URLSearchParams();

  if (params.q && params.q.trim() !== "") {
    searchParams.set("q", params.q.trim());
  }
  if (params.projectId) {
    searchParams.set("projectId", params.projectId);
  }
  params.status?.forEach((status) => searchParams.append("status", status));
  params.priority?.forEach((priority) => searchParams.append("priority", priority));
  params.labelId?.forEach((labelId) => searchParams.append("labelId", labelId));
  if (params.overdue !== undefined) {
    searchParams.set("overdue", String(params.overdue));
  }
  if (params.archived !== undefined) {
    searchParams.set("archived", String(params.archived));
  }
  if (params.dueBefore) {
    searchParams.set("dueBefore", params.dueBefore);
  }
  if (params.dueAfter) {
    searchParams.set("dueAfter", params.dueAfter);
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
  const response = await apiRequest<TaskQueryResponseDto>(
    `/tasks${queryString ? `?${queryString}` : ""}`,
    { method: "GET", ...(signal ? { signal } : {}) },
  );

  return {
    items: response.page.items.map((item) => mapTaskResponse(item, projectById)),
    page: response.page,
    summary: mapTaskSummary(response.summary),
  };
}

export async function getTaskSummaryCounts(signal?: AbortSignal): Promise<TaskSummaryCounts> {
  const dto = await apiRequest<TaskSummaryCountsDto>("/tasks/summary-counts", {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return mapTaskSummary(dto);
}

export async function listLabels(signal?: AbortSignal): Promise<readonly TaskFormLabelOption[]> {
  const labels = await apiRequest<readonly LabelResponseDto[]>("/labels", {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return labels.map((label) => ({ id: label.id, name: label.name }));
}

export async function createTask(request: CreateTaskRequestDto): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>("/tasks", { method: "POST", body: request });
  return mapTaskResponse(dto);
}

export async function updateTask(id: string, request: UpdateTaskRequestDto): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>(`/tasks/${id}`, { method: "PUT", body: request });
  return mapTaskResponse(dto);
}

export async function changeTaskStatus(
  id: string,
  request: { readonly status: TaskStatus; readonly version: number },
): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>(`/tasks/${id}/status`, {
    method: "PATCH",
    body: request,
  });
  return mapTaskResponse(dto);
}

export async function completeTask(
  id: string,
  request: VersionedTaskRequestDto,
): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>(`/tasks/${id}/complete`, {
    method: "POST",
    body: request,
  });
  return mapTaskResponse(dto);
}

export async function archiveTask(
  id: string,
  request: VersionedTaskRequestDto,
): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>(`/tasks/${id}/archive`, {
    method: "POST",
    body: request,
  });
  return mapTaskResponse(dto);
}

export async function restoreTask(
  id: string,
  request: VersionedTaskRequestDto,
): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>(`/tasks/${id}/restore`, {
    method: "POST",
    body: request,
  });
  return mapTaskResponse(dto);
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>(`/tasks/${id}`, { method: "DELETE" });
}

export async function duplicateTask(id: string, newTitle?: string): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>(`/tasks/${id}/duplicate`, {
    method: "POST",
    ...(newTitle ? { body: { newTitle } } : {}),
  });
  return mapTaskResponse(dto);
}

export async function setTaskMit(id: string, date: string): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>(`/tasks/${id}/mit`, {
    method: "POST",
    body: { date } satisfies SetMitRequestDto,
  });
  return mapTaskResponse(dto);
}

export async function clearTaskMit(id: string): Promise<TaskRecord> {
  const dto = await apiRequest<TaskResponseDto>(`/tasks/${id}/mit`, { method: "DELETE" });
  return mapTaskResponse(dto);
}

export function toBulkRequest(
  taskIds: readonly string[],
  action: BulkTaskAction,
): BulkTaskActionRequestDto {
  switch (action.type) {
    case "STATUS":
      return { taskIds, action: "STATUS", status: action.status };
    case "PRIORITY":
      return { taskIds, action: "PRIORITY", priority: action.priority };
    case "PROJECT":
      return { taskIds, action: "PROJECT", projectId: action.projectId };
    case "ADD_LABEL":
      return { taskIds, action: "ADD_LABEL", labelId: action.labelId };
    case "REMOVE_LABEL":
      return { taskIds, action: "REMOVE_LABEL", labelId: action.labelId };
    case "SCHEDULE":
      return { taskIds, action: "SCHEDULE", dueAt: action.dueAt };
    case "CLEAR_SCHEDULE":
      return { taskIds, action: "CLEAR_SCHEDULE" };
    case "ARCHIVE":
      return { taskIds, action: "ARCHIVE" };
  }
}

export function mapBulkOutcome(
  response: BulkTaskActionResponseDto,
  titlesById: ReadonlyMap<string, string>,
): BulkActionOutcome {
  return {
    requested: response.requested,
    succeeded: response.succeeded,
    failed: response.results
      .filter((item) => item.outcome === "FAILED")
      .map((item) => ({
        taskId: item.taskId,
        title: titlesById.get(item.taskId) ?? item.taskId,
        errorCode: item.errorCode ?? "INTERNAL_ERROR",
      })),
  };
}

export async function applyBulkTaskAction(
  taskIds: readonly string[],
  action: BulkTaskAction,
  titlesById: ReadonlyMap<string, string> = new Map(),
): Promise<BulkActionOutcome> {
  const response = await apiRequest<BulkTaskActionResponseDto>("/tasks/bulk-actions", {
    method: "POST",
    body: toBulkRequest(taskIds, action),
  });
  return mapBulkOutcome(response, titlesById);
}
