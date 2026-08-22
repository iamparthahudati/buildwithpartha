export { TaskRow, type TaskRowProps } from "./components/TaskRow";
export { TaskCard, type TaskCardProps } from "./components/TaskCard";
export {
  TaskDetailsHeader,
  type TaskDetailsHeaderProps,
  type TaskDetailsHeaderTask,
  type TaskDetailsLabel,
} from "./components/TaskDetailsHeader";
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
  mapTaskResponse,
  mapTaskSummary,
  mapBulkOutcome,
  toBulkRequest,
  type TaskQueryParams,
  type TaskQueryResult,
  type TaskResponseDto,
  type TaskSummaryCountsDto,
  type CreateTaskRequestDto,
  type UpdateTaskRequestDto,
} from "./api/tasksApi";

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
