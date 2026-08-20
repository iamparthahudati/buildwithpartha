import { useCallback } from "react";
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
} from "@features/projects";
import { useAuthSession } from "@state/authSession";

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

  return (
    <ProjectDetailsScreen
      {...(data?.project ? { project: data.project } : {})}
      milestones={data?.milestones ?? []}
      ownerName={user?.displayName ?? "You"}
      selectedTab={currentTab}
      onTabChange={handleTabChange}
      loading={isLoading}
      notFound={isError && error?.message?.includes("404")}
      forbidden={isError && error?.message?.includes("403")}
      error={isError ? error : null}
      onRetry={refetch}
      onGoBack={handleGoBack}
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
