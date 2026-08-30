import { apiRequest } from "@lib/apiClient";

/** Backend DTO for a milestone a task is assigned to (LOS-0826). */
export interface TaskMilestoneDto {
  readonly milestoneId: string;
  readonly projectId: string;
  readonly title: string;
  readonly date?: string | null;
}

/** Backend wrapper: `milestone` is null when the task has no assignment. */
export interface TaskMilestoneAssignmentDto {
  readonly milestone: TaskMilestoneDto | null;
}

export interface TaskMilestone {
  readonly milestoneId: string;
  readonly projectId: string;
  readonly title: string;
  readonly date: string | null;
}

function mapTaskMilestone(dto: TaskMilestoneDto): TaskMilestone {
  return {
    milestoneId: dto.milestoneId,
    projectId: dto.projectId,
    title: dto.title,
    date: dto.date ?? null,
  };
}

/** Assigns the task to a milestone in the same project. */
export async function assignTaskMilestone(
  taskId: string,
  milestoneId: string,
): Promise<TaskMilestone | null> {
  const dto = await apiRequest<TaskMilestoneAssignmentDto>(`/tasks/${taskId}/milestone`, {
    method: "PUT",
    body: { milestoneId },
  });
  return dto.milestone ? mapTaskMilestone(dto.milestone) : null;
}

/** Clears any milestone assignment for the task. */
export async function clearTaskMilestone(taskId: string): Promise<void> {
  await apiRequest<void>(`/tasks/${taskId}/milestone`, { method: "DELETE" });
}

/** Fetches the milestone the task is currently assigned to, or null. */
export async function getTaskMilestone(
  taskId: string,
  signal?: AbortSignal,
): Promise<TaskMilestone | null> {
  const dto = await apiRequest<TaskMilestoneAssignmentDto>(`/tasks/${taskId}/milestone`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return dto.milestone ? mapTaskMilestone(dto.milestone) : null;
}
