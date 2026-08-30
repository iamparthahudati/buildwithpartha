import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { assignTaskMilestone, clearTaskMilestone, type TaskMilestone } from "@features/tasks";

import { milestoneTasksQueryKeys } from "./useMilestoneTasks";

export interface AssignTaskToMilestoneVariables {
  readonly milestoneId: string;
  readonly taskId: string;
}

export interface UseMilestoneTaskAssignmentResult {
  readonly assign: UseMutationResult<TaskMilestone | null, Error, AssignTaskToMilestoneVariables>;
  readonly unassign: UseMutationResult<void, Error, string>;
}

/**
 * Mutations to assign a task to a milestone or clear its assignment (LOS-0826), invalidating the
 * per-milestone task lists so the Project Timeline grouping refreshes.
 */
export function useMilestoneTaskAssignment(): UseMilestoneTaskAssignmentResult {
  const queryClient = useQueryClient();
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: milestoneTasksQueryKeys.all });

  const assign = useMutation({
    mutationFn: ({ milestoneId, taskId }: AssignTaskToMilestoneVariables) =>
      assignTaskMilestone(taskId, milestoneId),
    onSuccess: invalidate,
  });

  const unassign = useMutation({
    mutationFn: (taskId: string) => clearTaskMilestone(taskId),
    onSuccess: invalidate,
  });

  return { assign, unassign };
}
