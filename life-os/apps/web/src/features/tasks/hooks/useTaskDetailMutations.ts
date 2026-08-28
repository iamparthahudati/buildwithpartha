import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateActivityQueries } from "@features/activity";

import {
  addSubtask,
  addTaskDependency,
  deleteSubtask,
  removeTaskDependency,
  reorderSubtasks,
  toggleSubtask,
  updateSubtask,
} from "../api/tasksApi";
import { TASKS_QUERY_KEY } from "./useTasks";

export function useTaskDetailMutations(taskId: string) {
  const queryClient = useQueryClient();
  const refreshCanonicalTaskState = () => {
    void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    void invalidateActivityQueries(queryClient);
  };

  const addSubtaskMutation = useMutation({
    mutationFn: (title: string) => addSubtask(taskId, title),
    onSuccess: refreshCanonicalTaskState,
  });

  const editSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, title }: { readonly subtaskId: string; readonly title: string }) =>
      updateSubtask(taskId, subtaskId, { title }),
    onSuccess: refreshCanonicalTaskState,
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId }: { readonly subtaskId: string; readonly completed: boolean }) =>
      toggleSubtask(taskId, subtaskId),
    onSuccess: refreshCanonicalTaskState,
  });

  const reorderSubtasksMutation = useMutation({
    mutationFn: (subtaskIds: readonly string[]) => reorderSubtasks(taskId, subtaskIds),
    onSuccess: refreshCanonicalTaskState,
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => deleteSubtask(taskId, subtaskId),
    onSuccess: refreshCanonicalTaskState,
  });

  const addBlockerMutation = useMutation({
    mutationFn: (targetTaskId: string) => addTaskDependency(taskId, targetTaskId, "BLOCKER"),
    onSuccess: refreshCanonicalTaskState,
  });

  const removeDependencyMutation = useMutation({
    mutationFn: ({
      targetTaskId,
      relationship,
    }: {
      readonly targetTaskId: string;
      readonly relationship: "BLOCKER" | "DEPENDENT";
    }) => removeTaskDependency(taskId, targetTaskId, relationship),
    onSuccess: refreshCanonicalTaskState,
  });

  return {
    addSubtask: addSubtaskMutation,
    editSubtask: editSubtaskMutation,
    toggleSubtask: toggleSubtaskMutation,
    reorderSubtasks: reorderSubtasksMutation,
    deleteSubtask: deleteSubtaskMutation,
    addBlocker: addBlockerMutation,
    removeDependency: removeDependencyMutation,
  } as const;
}
