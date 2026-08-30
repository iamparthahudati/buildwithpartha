export { ProjectRow, type ProjectRowProps } from "./components/ProjectRow";
export { ProjectCard, type ProjectCardProps } from "./components/ProjectCard";
export {
  ProjectDetailsHeader,
  type ProjectDetailsHeaderProps,
} from "./components/ProjectDetailsHeader";
export {
  ProjectOverview,
  type ProjectOverviewProps,
  type ProjectOverviewTask,
} from "./components/ProjectOverview";
export { ProjectForm, type ProjectFormProps, type ProjectFormData } from "./components/ProjectForm";
export {
  ProjectSummaryMetrics,
  type ProjectSummaryMetricsProps,
  type ProjectSummaryCounts,
  type ProjectFilterCategory,
} from "./components/ProjectSummaryMetrics";
export { ProjectsScreen, type ProjectsScreenProps } from "./components/ProjectsScreen";
export { ProjectTimeline, type ProjectTimelineProps } from "./components/ProjectTimeline";
export {
  ProjectDetailsScreen,
  type ProjectDetailsScreenProps,
} from "./components/ProjectDetailsScreen";
export {
  MilestoneFormDialog,
  type MilestoneFormDialogProps,
  type MilestoneFormData,
} from "./components/MilestoneFormDialog";
export type { Project, ProjectStatus, ProjectPriority, ProjectHealth } from "./model/project";
export type { Milestone, MilestoneStatus } from "./model/milestone";

export {
  queryProjects,
  getProject,
  getProjectDetail,
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  mapProjectResponse,
  type ProjectResponseDto,
  type ProjectSummaryCountsDto,
  type ProjectQueryResponseDto,
  type ProjectDetailResponseDto,
  type ProjectDetail,
  type CreateProjectRequestDto,
  type UpdateProjectRequestDto,
  type ArchiveProjectRequestDto,
  type RestoreProjectRequestDto,
  type ProjectQueryParams,
} from "./api/projectsApi";

export {
  getMilestones,
  createMilestone,
  updateMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  mapMilestoneResponse,
  type MilestoneResponseDto,
  type CreateMilestoneRequestDto,
  type UpdateMilestoneRequestDto,
  type UpdateMilestoneStatusRequestDto,
} from "./api/milestonesApi";

export {
  PROJECTS_QUERY_KEY,
  projectsQueryKeys,
  invalidateProjectsQueries,
  useProjects,
  useProjectDetail,
  type UseProjectsResult,
} from "./hooks/useProjects";

export {
  useCreateProject,
  useUpdateProject,
  useArchiveProject,
  useRestoreProject,
  useDeleteProject,
} from "./hooks/useProjectMutations";

export { milestonesQueryKeys, useMilestones } from "./hooks/useMilestones";

export {
  milestoneTasksQueryKeys,
  useMilestoneTasks,
  type UseMilestoneTasksResult,
} from "./hooks/useMilestoneTasks";
export type {
  MilestoneTaskSummary,
  MilestoneTaskStatus,
  MilestoneTaskPriority,
  TasksByMilestone,
} from "./model/milestoneTask";
export {
  getMilestoneTasks,
  mapMilestoneTaskItem,
  type MilestoneTaskItemDto,
  type MilestoneTasksResponseDto,
} from "./api/milestoneTasksApi";

export {
  useCreateMilestone,
  useUpdateMilestone,
  useUpdateMilestoneStatus,
  useDeleteMilestone,
} from "./hooks/useMilestoneMutations";
