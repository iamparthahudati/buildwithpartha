import { useCallback, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useCommentMutations, useComments } from "@features/comments";
import {
  activityFilterEmptyTitle,
  activityMatchesFilter,
  mapActivityEvent,
  useActivity,
  type ActivityTypeFilter,
} from "@features/activity";
import {
  ProjectDetailsScreen,
  useProjectDetail,
  useCreateMilestone,
  useUpdateMilestone,
  useUpdateMilestoneStatus,
  useDeleteMilestone,
  useMilestoneTasks,
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
const COMMENTS_PAGE_SIZE = 20;
const ACTIVITY_PAGE_SIZE = 20;

function safeCommentMutationError(action: "add" | "edit" | "delete", error: unknown) {
  if (!error) return undefined;
  if (action === "add") {
    return "We couldn't add this comment. Your text is still here. Try again.";
  }
  if (action === "edit") {
    return "We couldn't save this comment. Your changes are still here. Try again.";
  }
  return "We couldn't delete this comment. It remains available. Try again.";
}

export function ProjectDetailsRoute() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const [commentPagination, setCommentPagination] = useState({ parentId: projectId, page: 1 });
  const [activityPagination, setActivityPagination] = useState({ parentId: projectId, page: 1 });
  const [activityFilterState, setActivityFilterState] = useState<{
    readonly parentId: string;
    readonly filter: ActivityTypeFilter;
  }>({ parentId: projectId, filter: "ALL" });
  const [pendingComment, setPendingComment] = useState<{
    readonly body: string;
    readonly createdAt: string;
  } | null>(null);

  const currentTab = searchParams.get("tab") ?? "overview";
  const commentsPage = commentPagination.parentId === projectId ? commentPagination.page : 1;
  const setCommentsPage = (page: number) => setCommentPagination({ parentId: projectId, page });
  const activityPage = activityPagination.parentId === projectId ? activityPagination.page : 1;
  const activityFilter =
    activityFilterState.parentId === projectId ? activityFilterState.filter : "ALL";
  const setActivityPage = (page: number) => setActivityPagination({ parentId: projectId, page });
  const setActivityFilter = (filter: ActivityTypeFilter) => {
    setActivityFilterState({ parentId: projectId, filter });
    setActivityPage(1);
  };

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
  const milestoneIds = useMemo(
    () => (data?.milestones ?? []).map((milestone) => milestone.id),
    [data?.milestones],
  );
  const { tasksByMilestone } = useMilestoneTasks(milestoneIds, milestoneIds.length > 0);
  const tasksEnabled = user !== null && projectId !== "";
  const timeZone = user?.timeZone ?? "UTC";
  const locale = user?.locale ?? "en-US";
  const commentsQuery = useComments(
    "PROJECT",
    projectId,
    commentsPage,
    COMMENTS_PAGE_SIZE,
    user !== null && projectId !== "",
  );
  const commentMutations = useCommentMutations("PROJECT", projectId);
  const activityQuery = useActivity(
    "PROJECT",
    projectId,
    activityPage - 1,
    ACTIVITY_PAGE_SIZE,
    user !== null && projectId !== "" && (currentTab === "overview" || currentTab === "activity"),
  );

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
  const project = data?.project;
  const commentRecords = commentsQuery.data?.items ?? [];
  const commentById = new Map(commentRecords.map((comment) => [comment.id, comment]));
  const comments = commentRecords.map((comment) => ({
    id: comment.id,
    authorName: comment.authorId === user?.id ? (user?.displayName ?? "You") : "You",
    body: comment.body,
    createdAt: comment.createdAt,
    ...(comment.editedAt ? { editedAt: comment.editedAt } : {}),
  }));
  const visibleComments =
    pendingComment && commentsPage === 1
      ? [
          {
            id: `pending-${projectId}`,
            authorName: user?.displayName ?? "You",
            body: pendingComment.body,
            createdAt: pendingComment.createdAt,
            pendingLabel: "Posting…",
          },
          ...comments,
        ]
      : comments;
  const allActivityEvents = useMemo(
    () =>
      (activityQuery.data?.items ?? []).map((event) =>
        mapActivityEvent(event, user?.displayName ?? "You"),
      ),
    [activityQuery.data?.items, user?.displayName],
  );
  const filteredActivityEvents = useMemo(
    () =>
      (activityQuery.data?.items ?? [])
        .filter((event) => activityMatchesFilter(event, activityFilter))
        .map((event) => mapActivityEvent(event, user?.displayName ?? "You")),
    [activityFilter, activityQuery.data?.items, user?.displayName],
  );

  const projectWithTaskCounts = useMemo((): Project | undefined => {
    if (!project) {
      return undefined;
    }

    return {
      ...project,
      totalTasksCount,
      completedTasksCount,
    };
  }, [completedTasksCount, project, totalTasksCount]);

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

  const addCommentError = safeCommentMutationError("add", commentMutations.add.error);
  const editCommentError = safeCommentMutationError("edit", commentMutations.edit.error);
  const deleteCommentError = safeCommentMutationError("delete", commentMutations.remove.error);

  return (
    <ProjectDetailsScreen
      {...(projectWithTaskCounts ? { project: projectWithTaskCounts } : {})}
      milestones={data?.milestones ?? []}
      tasksByMilestone={tasksByMilestone}
      topTasks={topTasks}
      activityEvents={allActivityEvents}
      activityTabEvents={filteredActivityEvents}
      activityCount={activityQuery.data?.totalItems ?? 0}
      activityStatus={
        activityQuery.isError
          ? {
              type: "error",
              message: "Project activity couldn't load. Project details are still available.",
              onRetry: () => void activityQuery.refetch(),
            }
          : activityQuery.isPending
            ? { type: "loading" }
            : { type: "ready" }
      }
      activityPage={(activityQuery.data?.page ?? activityPage - 1) + 1}
      activityPageSize={activityQuery.data?.size ?? ACTIVITY_PAGE_SIZE}
      activityTotal={activityQuery.data?.totalItems ?? 0}
      onActivityPageChange={setActivityPage}
      activityFilter={activityFilter}
      onActivityFilterChange={setActivityFilter}
      activityEmptyTitle={activityFilterEmptyTitle(activityFilter)}
      tasksTotalCount={totalTasksCount}
      tasksLoading={projectTasksQuery.isPending}
      ownerName={user?.displayName ?? "You"}
      locale={locale}
      timeZone={timeZone}
      comments={visibleComments}
      commentsCount={(commentsQuery.data?.total ?? 0) + (pendingComment ? 1 : 0)}
      commentsStatus={
        commentsQuery.isError
          ? {
              type: "error",
              message: "Project comments couldn't load. Project details are still available.",
              onRetry: () => void commentsQuery.refetch(),
            }
          : commentsQuery.isPending && pendingComment === null
            ? { type: "loading" }
            : { type: "ready" }
      }
      commentsPage={commentsQuery.data?.page ?? commentsPage}
      commentsPageSize={commentsQuery.data?.pageSize ?? COMMENTS_PAGE_SIZE}
      commentsTotal={commentsQuery.data?.total ?? 0}
      onCommentsPageChange={setCommentsPage}
      addCommentPending={commentMutations.add.isPending}
      {...(addCommentError ? { addCommentError } : {})}
      onAddComment={async (body) => {
        setCommentsPage(1);
        setPendingComment({ body, createdAt: new Date().toISOString() });
        try {
          await commentMutations.add.mutateAsync(body);
        } finally {
          setPendingComment(null);
        }
      }}
      editCommentPending={commentMutations.edit.isPending}
      {...(editCommentError ? { editCommentError } : {})}
      onEditComment={(id, body) => {
        const current = commentById.get(id);
        if (!current?.canEdit) return;
        void commentMutations.edit
          .mutateAsync({ id, body, version: current.version })
          .catch(() => undefined);
      }}
      deleteCommentPending={commentMutations.remove.isPending}
      {...(deleteCommentError ? { deleteCommentError } : {})}
      onDeleteComment={(id) => {
        const current = commentById.get(id);
        if (!current?.canDelete) return;
        void commentMutations.remove
          .mutateAsync({ id, version: current.version })
          .catch(() => undefined);
      }}
      selectedTab={currentTab}
      {...(searchParams.get("milestone")
        ? { selectedMilestoneId: searchParams.get("milestone")! }
        : {})}
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
