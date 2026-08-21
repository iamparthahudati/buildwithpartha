import { useCallback, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ProjectDetailsScreen,
  useProjectDetail,
  useCreateMilestone,
  useUpdateMilestone,
  useUpdateMilestoneStatus,
  useDeleteMilestone,
  useArchiveProject,
  useRestoreProject,
  useDeleteProject,
  type MilestoneFormData,
  type MilestoneStatus,
  type Project,
} from "@features/projects";
import { useTasks } from "@features/tasks";
import { useAuthSession } from "@state/authSession";

import { mapTaskRecordToProjectOverviewTask } from "./projectTaskMapping";

const PROJECT_TASKS_PAGE_SIZE = 100;

export function ProjectDetailsRoute() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthSession();

  const currentTab = searchParams.get("tab") ?? "overview";

  const handleTabChange = useCallback(
    (newTab: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newTab === "overview") {
            next.delete("tab");
          } else {
            next.set("tab", newTab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const { data, isLoading, isError, error, refetch } = useProjectDetail(projectId);
  const tasksEnabled = user !== null && projectId !== "";
  const timeZone = user?.timeZone ?? "UTC";

  const projectTasksQuery = useTasks(
    {
      projectId,
      archived: false,
      page: 0,
      size: PROJECT_TASKS_PAGE_SIZE,
      sortBy: "updatedAt",
      sortDirection: "DESC",
    },
    tasksEnabled,
  );

  const completedProjectTasksQuery = useTasks(
    {
      projectId,
      archived: false,
      status: ["DONE"],
      page: 0,
      size: 1,
    },
    tasksEnabled,
  );

  const topTasks = useMemo(
    () =>
      (projectTasksQuery.data?.items ?? []).map((task) =>
        mapTaskRecordToProjectOverviewTask(task, timeZone),
      ),
    [projectTasksQuery.data?.items, timeZone],
  );

  const totalTasksCount = projectTasksQuery.data?.page.totalItems ?? 0;
  const completedTasksCount = completedProjectTasksQuery.data?.page.totalItems ?? 0;

  const projectWithTaskCounts = useMemo((): Project | undefined => {
    if (!data?.project) {
      return undefined;
    }

    return {
      ...data.project,
      totalTasksCount,
      completedTasksCount,
    };
  }, [completedTasksCount, data?.project, totalTasksCount]);

  const createMilestoneMutation = useCreateMilestone();
  const updateMilestoneMutation = useUpdateMilestone();
  const updateMilestoneStatusMutation = useUpdateMilestoneStatus();
  const deleteMilestoneMutation = useDeleteMilestone();
  const archiveProjectMutation = useArchiveProject();
  const restoreProjectMutation = useRestoreProject();
  const deleteProjectMutation = useDeleteProject();

  const handleAddMilestone = useCallback(
    async (formData: MilestoneFormData) => {
      await createMilestoneMutation.mutateAsync({
        projectId,
        request: {
          title: formData.title,
          ...(formData.date ? { date: formData.date } : {}),
          ...(formData.status ? { status: formData.status } : {}),
        },
      });
    },
    [createMilestoneMutation, projectId],
  );

  const handleUpdateMilestone = useCallback(
    async (milestoneId: string, formData: MilestoneFormData) => {
      const existing = data?.milestones.find((m) => m.id === milestoneId);
      if (!existing) return;

      await updateMilestoneMutation.mutateAsync({
        projectId,
        milestoneId,
        request: {
          title: formData.title,
          ...(formData.date !== undefined ? { date: formData.date } : {}),
          ...(formData.status ? { status: formData.status } : {}),
          version: existing.version,
        },
      });
    },
    [data, projectId, updateMilestoneMutation],
  );

  const handleMilestoneStatusChange = useCallback(
    async (milestoneId: string, status: MilestoneStatus) => {
      const existing = data?.milestones.find((m) => m.id === milestoneId);
      if (!existing) return;

      await updateMilestoneStatusMutation.mutateAsync({
        projectId,
        milestoneId,
        request: {
          status,
          version: existing.version,
        },
      });
    },
    [data, projectId, updateMilestoneStatusMutation],
  );

  const handleDeleteMilestone = useCallback(
    async (milestoneId: string) => {
      await deleteMilestoneMutation.mutateAsync({
        projectId,
        milestoneId,
      });
    },
    [deleteMilestoneMutation, projectId],
  );

  const handleArchiveProject = useCallback(async () => {
    if (!data?.project) return;
    await archiveProjectMutation.mutateAsync({
      id: data.project.id,
      request: {
        version: data.project.version,
      },
    });
  }, [archiveProjectMutation, data]);

  const handleRestoreProject = useCallback(async () => {
    if (!data?.project) return;
    await restoreProjectMutation.mutateAsync({
      id: data.project.id,
      request: {
        version: data.project.version,
      },
    });
  }, [data, restoreProjectMutation]);

  const handleDeleteProject = useCallback(async () => {
    if (!data?.project) return;
    await deleteProjectMutation.mutateAsync(data.project.id);
    navigate("/life-os/app/projects");
  }, [data, deleteProjectMutation, navigate]);

  const handleGoBack = useCallback(() => {
    navigate("/life-os/app/projects");
  }, [navigate]);

  const handleAddTask = useCallback(() => {
    navigate(`/life-os/app/tasks?projectId=${encodeURIComponent(projectId)}`);
  }, [navigate, projectId]);

  const handleRetry = useCallback(() => {
    void refetch();
    void projectTasksQuery.refetch();
    void completedProjectTasksQuery.refetch();
  }, [completedProjectTasksQuery, projectTasksQuery, refetch]);

  return (
    <ProjectDetailsScreen
      {...(projectWithTaskCounts ? { project: projectWithTaskCounts } : {})}
      milestones={data?.milestones ?? []}
      topTasks={topTasks}
      tasksTotalCount={totalTasksCount}
      tasksLoading={projectTasksQuery.isPending}
      ownerName={user?.displayName ?? "You"}
      selectedTab={currentTab}
      onTabChange={handleTabChange}
      loading={isLoading}
      notFound={isError && error?.message?.includes("404")}
      forbidden={isError && error?.message?.includes("403")}
      error={isError ? error : null}
      onRetry={handleRetry}
      onGoBack={handleGoBack}
      onAddTask={handleAddTask}
      onAddMilestone={handleAddMilestone}
      onUpdateMilestone={handleUpdateMilestone}
      onMilestoneStatusChange={handleMilestoneStatusChange}
      onDeleteMilestone={handleDeleteMilestone}
      onArchiveProject={handleArchiveProject}
      onRestoreProject={handleRestoreProject}
      onDeleteProject={handleDeleteProject}
    />
  );
}
