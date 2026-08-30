export { TaskRow, type TaskRowProps } from "./components/TaskRow";
export { TaskCard, type TaskCardProps } from "./components/TaskCard";
export {
  TaskDetailsHeader,
  type TaskDetailsHeaderProps,
  type TaskDetailsHeaderTask,
  type TaskDetailsLabel,
} from "./components/TaskDetailsHeader";
export {
  SubtaskChecklist,
  type SubtaskChecklistItem,
  type SubtaskChecklistOperation,
  type SubtaskChecklistOperationError,
  type SubtaskChecklistOperationTarget,
  type SubtaskChecklistProps,
} from "./components/SubtaskChecklist";
export {
  DependencyEditor,
  type DependencyEditorOperation,
  type DependencyEditorOperationError,
  type DependencyEditorProps,
  type DependencyEditorTask,
  type DependencyRelationship,
} from "./components/DependencyEditor";
export {
  SchedulingPanel,
  type SchedulingPanelActiveFocusSession,
  type SchedulingPanelProps,
  type SchedulingPanelTask,
} from "./components/SchedulingPanel";
export {
  TaskDetailsScreen,
  type TaskDetailsActivityConfig,
  type TaskDetailsAttachmentsConfig,
  type TaskDetailsAttachmentsStatus,
  type TaskDetailsCommentsConfig,
  type TaskDetailsDependenciesConfig,
  type TaskDetailsHeaderConfig,
  type TaskDetailsSchedulingConfig,
  type TaskDetailsScreenProps,
  type TaskDetailsSubtasksConfig,
  type TaskDetailsTabId,
} from "./components/TaskDetailsScreen";
export { TaskDetailsSheet, type TaskDetailsSheetProps } from "./components/TaskDetailsSheet";
export {
  IntegratedTaskDetails,
  type IntegratedTaskDetailsProps,
} from "./components/IntegratedTaskDetails";
export {
  dependencyEditorErrorMessage,
  type DependencyEditorErrorReason,
} from "./model/dependencyEditorErrors";
export {
  TaskForm,
  type TaskFormData,
  type TaskFormLabelOption,
  type TaskFormProjectOption,
  type TaskFormProps,
} from "./components/TaskForm";
export {
  TaskSummaryMetrics,
  type TaskSummaryCounts,
  type TaskSummaryMetricsProps,
  type TaskSummaryMetricsStatus,
} from "./components/TaskSummaryMetrics";
export {
  type TaskListItem,
  type TaskPriority,
  type TaskProjectContext,
  type TaskRecord,
  type TaskStatus,
  toTaskListItem,
} from "./model/task";
export {
  TASK_FILTER_PRESETS,
  applyTaskFilterPreset,
  readTaskFilterPreset,
  type TaskFilterPresetDefinition,
  type TaskFilterPresetId,
} from "./model/taskFilterPresets";
export { TasksScreen, type TasksScreenProps } from "./components/TasksScreen";
export {
  applyTasksViewTab,
  readTasksViewTab,
  TASK_SORT_OPTIONS,
  TASKS_VIEW_TABS,
  DEFAULT_TASK_SORT,
  describeBulkError,
  type BulkActionOutcome,
  type BulkItemFailure,
  type BulkTaskAction,
  type TaskSortState,
  type TasksViewMode,
  type TasksViewTab,
} from "./model/taskScreen";

export {
  queryTasks,
  getTaskDetail,
  addSubtask,
  updateSubtask,
  toggleSubtask,
  reorderSubtasks,
  deleteSubtask,
  addTaskDependency,
  removeTaskDependency,
  mapTaskResponse,
  mapTaskDetailResponse,
  mapTaskSummary,
  mapBulkOutcome,
  toBulkRequest,
  type TaskQueryParams,
  type TaskQueryResult,
  type TaskResponseDto,
  type TaskDetail,
  type TaskDetailResponseDto,
  type TaskDetailCountsDto,
  type SubtaskResponseDto,
  type TaskDependenciesSummaryDto,
  type TaskSummaryCountsDto,
  type CreateTaskRequestDto,
  type UpdateTaskRequestDto,
} from "./api/tasksApi";

export { useTaskDetail } from "./hooks/useTaskDetail";
export { useTaskDetailMutations } from "./hooks/useTaskDetailMutations";

export {
  TASKS_QUERY_KEY,
  tasksQueryKeys,
  invalidateTasksQueries,
  useTasks,
  useTaskLabels,
} from "./hooks/useTasks";

export {
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useChangeTaskStatus,
  useArchiveTask,
  useRestoreTask,
  useDeleteTask,
  useDuplicateTask,
  useToggleTaskMit,
  useBulkTaskAction,
  isConflict,
} from "./hooks/useTaskMutations";

export {
  assignTaskMilestone,
  clearTaskMilestone,
  getTaskMilestone,
  type TaskMilestone,
  type TaskMilestoneDto,
  type TaskMilestoneAssignmentDto,
} from "./api/taskMilestoneApi";
