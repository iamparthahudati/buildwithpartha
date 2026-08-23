import { apiRequest } from "@lib/apiClient";

export type ActivitySubjectType = "TASK" | "PROJECT";

export type ActivityEventType =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_ARCHIVED"
  | "PROJECT_RESTORED"
  | "PROJECT_DELETED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "TASK_ARCHIVED"
  | "TASK_RESTORED"
  | "TASK_DELETED"
  | "SUBTASK_CREATED"
  | "SUBTASK_UPDATED"
  | "SUBTASK_COMPLETED"
  | "SUBTASK_DELETED"
  | "COMMENT_CREATED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED";

export interface ActivityObjectDto {
  readonly type: ActivitySubjectType;
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface ActivityEventDto {
  readonly id: string;
  readonly actorUserId: string;
  readonly eventType: ActivityEventType;
  readonly object: ActivityObjectDto | null;
  readonly occurredAt: string;
}

export interface ActivityPageDto {
  readonly items: readonly ActivityEventDto[];
  /** Zero-based API page. */
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export async function queryActivity(
  subjectType: ActivitySubjectType,
  subjectId: string,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<ActivityPageDto> {
  const collection = subjectType === "TASK" ? "tasks" : "projects";
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return apiRequest<ActivityPageDto>(
    `/${collection}/${encodeURIComponent(subjectId)}/activity?${params.toString()}`,
    { method: "GET", ...(signal ? { signal } : {}) },
  );
}
