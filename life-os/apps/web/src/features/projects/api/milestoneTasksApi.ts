import { apiRequest } from "@lib/apiClient";

import type {
  MilestoneTaskPriority,
  MilestoneTaskStatus,
  MilestoneTaskSummary,
} from "../model/milestoneTask";

/** Backend DTO item from GET /milestones/{milestoneId}/tasks. */
export interface MilestoneTaskItemDto {
  readonly taskId: string;
  readonly title: string;
  readonly status: string;
  readonly priority: string;
  readonly estimateMinutes: number;
}

/** Backend DTO from GET /milestones/{milestoneId}/tasks. */
export interface MilestoneTasksResponseDto {
  readonly tasks: readonly MilestoneTaskItemDto[];
}

/** Maps a milestone task DTO item to the frontend summary model. */
export function mapMilestoneTaskItem(dto: MilestoneTaskItemDto): MilestoneTaskSummary {
  return {
    taskId: dto.taskId,
    title: dto.title,
    status: dto.status as MilestoneTaskStatus,
    priority: dto.priority as MilestoneTaskPriority,
    estimateMinutes: dto.estimateMinutes,
  };
}

/** Fetches the tasks assigned to a milestone. */
export async function getMilestoneTasks(
  milestoneId: string,
  signal?: AbortSignal,
): Promise<readonly MilestoneTaskSummary[]> {
  const response = await apiRequest<MilestoneTasksResponseDto>(`/milestones/${milestoneId}/tasks`, {
    method: "GET",
    ...(signal ? { signal } : {}),
  });
  return response.tasks.map(mapMilestoneTaskItem);
}
