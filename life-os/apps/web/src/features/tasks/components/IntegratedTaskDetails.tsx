import { useMemo, useState } from "react";

import { ConfirmDialog } from "@components/feedback";
import {
  activityFilterEmptyTitle,
  activityMatchesFilter,
  mapActivityEvent,
  useActivity,
  type ActivityTypeFilter,
} from "@features/activity";
import { useCommentMutations, useComments } from "@features/comments";
import { useProjects } from "@features/projects";
import { ApiError } from "@lib/apiClient";
import { todayLocalDate } from "@lib/localDateTime";

import { TaskForm, type TaskFormData } from "./TaskForm";
import {
  TaskDetailsScreen,
  type TaskDetailsScreenProps,
  type TaskDetailsTabId,
} from "./TaskDetailsScreen";
import { TaskDetailsSheet } from "./TaskDetailsSheet";
import {
  useArchiveTask,
  useCompleteTask,
  useChangeTaskStatus,
  useDeleteTask,
  useDuplicateTask,
  useRestoreTask,
  useToggleTaskMit,
  useUpdateTask,
} from "../hooks/useTaskMutations";
import { useTaskDetail } from "../hooks/useTaskDetail";
import { useTaskDetailMutations } from "../hooks/useTaskDetailMutations";
import { useTaskLabels, useTasks } from "../hooks/useTasks";
import type { TaskProjectContext } from "../model/task";

export interface IntegratedTaskDetailsProps {
  readonly taskId: string;
  readonly presentation?: "page" | "sheet";
  readonly open?: boolean;
  readonly onClose?: () => void;
  readonly selectedTab?: TaskDetailsTabId;
  readonly onTabChange?: (tab: TaskDetailsTabId) => void;
  readonly backHref: string;
  readonly backLabel?: string;
  readonly locale: string;
  readonly timeZone: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly onNavigate: (href: string) => void;
  readonly onDeleted?: () => void;
  readonly onMutationSuccess?: (message: string) => void;
}

type DestructiveAction = "archive" | "delete" | null;

const SAFE_MUTATION_ERROR =
  "We couldn't save this change. Confirmed Task details are still shown. Try again.";
const COMMENT_PAGE_SIZE = 20;
const ACTIVITY_PAGE_SIZE = 20;

function commentMutationError(action: "add" | "edit" | "delete", error: unknown) {
  if (!error) return undefined;
  if (isApiStatus(error, 409)) {
    return "This comment changed elsewhere. Load the latest comments and try again.";
  }
  if (action === "add") {
    return "We couldn't add this comment. Your text is still here. Try again.";
  }
  if (action === "edit") {
    return "We couldn't save this comment. Your changes are still here. Try again.";
  }
  return "We couldn't delete this comment. It remains available. Try again.";
}

function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

function toUpdateRequest(data: TaskFormData, version: number) {
  return {
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    dueAt: data.dueAt,
    estimateMinutes: data.estimateMinutes,
    progress: data.progress,
    mitDate: data.mitDate,
    labelIds: data.labelIds,
    version,
  };
}

/**
 * Query-backed Task Details integration shared by the direct route and list-context sheet.
 * React Query remains the only client copy of canonical Task domain state; local state here is
 * limited to dialogs, search text, and dismissible failure messages.
 */
export function IntegratedTaskDetails({
  taskId,
  presentation = "page",
  open = true,
  onClose,
  selectedTab,
  onTabChange,
  backHref,
  backLabel = "Tasks",
  locale,
  timeZone,
  authorId,
  authorName,
  onNavigate,
  onDeleted,
  onMutationSuccess,
}: IntegratedTaskDetailsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [destructiveAction, setDestructiveAction] = useState<DestructiveAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [blockerQuery, setBlockerQuery] = useState("");
  const [commentPagination, setCommentPagination] = useState({ parentId: taskId, page: 1 });
  const [activityPagination, setActivityPagination] = useState({ parentId: taskId, page: 1 });
  const [activityFilterState, setActivityFilterState] = useState<{
    readonly parentId: string;
    readonly filter: ActivityTypeFilter;
  }>({ parentId: taskId, filter: "ALL" });
  const [pendingComment, setPendingComment] = useState<{
    readonly body: string;
    readonly createdAt: string;
  } | null>(null);

  const commentPage = commentPagination.parentId === taskId ? commentPagination.page : 1;
  const setCommentPage = (page: number) => setCommentPagination({ parentId: taskId, page });
  const activityPage = activityPagination.parentId === taskId ? activityPagination.page : 1;
  const activityFilter =
    activityFilterState.parentId === taskId ? activityFilterState.filter : "ALL";
  const setActivityPage = (page: number) => setActivityPagination({ parentId: taskId, page });
  const setActivityFilter = (filter: ActivityTypeFilter) => {
    setActivityFilterState({ parentId: taskId, filter });
    setActivityPage(1);
  };

  const projectsQuery = useProjects({ size: 100, archived: false }, Boolean(taskId));
  const projectById = useMemo(() => {
    const map = new Map<string, TaskProjectContext>();
    for (const project of projectsQuery.data?.items ?? []) {
      map.set(project.id, {
        id: project.id,
        name: project.name,
        href: `/life-os/app/projects/${project.id}`,
      });
    }
    return map;
  }, [projectsQuery.data?.items]);
  const projectOptions = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((project) => ({
        id: project.id,
        name: project.name,
      })),
    [projectsQuery.data?.items],
  );

  const labelsQuery = useTaskLabels(Boolean(taskId));
  const detailQuery = useTaskDetail(taskId, Boolean(taskId));
  const candidateQuery = useTasks(
    {
      ...(blockerQuery.trim() ? { q: blockerQuery.trim() } : {}),
      archived: false,
      page: 0,
      size: 20,
      sortBy: "title",
      sortDirection: "ASC",
    },
    Boolean(taskId),
    projectById,
  );

  const detailMutations = useTaskDetailMutations(taskId);
  const commentsQuery = useComments(
    "TASK",
    taskId,
    commentPage,
    COMMENT_PAGE_SIZE,
    Boolean(taskId) && selectedTab === "comments",
  );
  const commentMutations = useCommentMutations("TASK", taskId);
  const activityQuery = useActivity(
    "TASK",
    taskId,
    activityPage - 1,
    ACTIVITY_PAGE_SIZE,
    Boolean(taskId) && selectedTab === "activity",
  );
  const updateMutation = useUpdateTask();
  const completeMutation = useCompleteTask();
  const changeStatusMutation = useChangeTaskStatus();
  const archiveMutation = useArchiveTask();
  const restoreMutation = useRestoreTask();
  const deleteMutation = useDeleteTask();
  const duplicateMutation = useDuplicateTask();
  const mitMutation = useToggleTaskMit();

  const detail = detailQuery.data;
  const detailError = detailQuery.error;
  const canonicalTask = detail?.task;
  const resolvedProject = canonicalTask?.project?.id
    ? (projectById.get(canonicalTask.project.id) ?? canonicalTask.project)
    : null;
  const labelsById = useMemo(
    () => new Map((labelsQuery.data ?? []).map((label) => [label.id, label.name])),
    [labelsQuery.data],
  );
  const headerTask = canonicalTask
    ? {
        ...canonicalTask,
        project: resolvedProject,
        labels: canonicalTask.labelIds.map((id) => ({ id, name: labelsById.get(id) ?? "Label" })),
      }
    : undefined;
  const commentRecords = commentsQuery.data?.items ?? [];
  const commentById = new Map(commentRecords.map((comment) => [comment.id, comment]));
  const comments = commentRecords.map((comment) => ({
    id: comment.id,
    authorName: comment.authorId === authorId ? authorName : "You",
    body: comment.body,
    createdAt: comment.createdAt,
    ...(comment.editedAt ? { editedAt: comment.editedAt } : {}),
  }));
  const visibleComments =
    pendingComment && commentPage === 1
      ? [
          {
            id: `pending-${taskId}`,
            authorName,
            body: pendingComment.body,
            createdAt: pendingComment.createdAt,
            pendingLabel: "Posting…",
          },
          ...comments,
        ]
      : comments;
  const activityEvents = useMemo(
    () =>
      (activityQuery.data?.items ?? [])
        .filter((event) => activityMatchesFilter(event, activityFilter))
        .map((event) => mapActivityEvent(event, authorName)),
    [activityFilter, activityQuery.data?.items, authorName],
  );

  const blockerOptions = (candidateQuery.data?.items ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    href: `/life-os/app/tasks/${task.id}?returnTo=${encodeURIComponent(backHref)}`,
  }));

  const conflictError = [
    updateMutation.error,
    completeMutation.error,
    changeStatusMutation.error,
    archiveMutation.error,
    restoreMutation.error,
  ].some((error) => isApiStatus(error, 409))
    ? "This Task changed elsewhere. Load the latest details before trying again."
    : undefined;

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setActionError(null);
    try {
      await action();
      onMutationSuccess?.(successMessage);
    } catch (error) {
      if (!isApiStatus(error, 409)) setActionError(SAFE_MUTATION_ERROR);
    }
  }

  const directHref = `/life-os/app/tasks/${taskId}?returnTo=${encodeURIComponent(backHref)}`;
  const breadcrumbs = headerTask
    ? [
        { label: backLabel, href: backHref },
        { label: headerTask.title, href: directHref },
      ]
    : undefined;

  const correlationId =
    detailError instanceof ApiError ? detailError.problem?.correlationId : undefined;
  const addCommentError = commentMutationError("add", commentMutations.add.error);
  const editCommentError = commentMutationError("edit", commentMutations.edit.error);
  const deleteCommentError = commentMutationError("delete", commentMutations.remove.error);
  const screenProps: TaskDetailsScreenProps = {
    ...(headerTask ? { task: headerTask } : {}),
    loading: detailQuery.isPending,
    unavailable: detailQuery.isError && isApiStatus(detailQuery.error, 404),
    error:
      detailQuery.isError && !isApiStatus(detailQuery.error, 404)
        ? "LifeOS couldn't load this Task right now. Confirm your connection and try again."
        : null,
    ...(correlationId ? { correlationId } : {}),
    onRetry: () => void detailQuery.refetch(),
    ...(onClose ? { onReturnToList: onClose } : {}),
    ...(selectedTab ? { selectedTab } : {}),
    ...(onTabChange ? { onTabChange } : {}),
    backgroundRefreshing: detailQuery.isFetching && detail !== undefined,
    mutationError: actionError,
    onDismissMutationError: () => setActionError(null),
    locale,
    timeZone,
    backHref,
    backLabel,
    ...(breadcrumbs ? { breadcrumbs } : {}),
    header: canonicalTask
      ? {
          ...(conflictError ? { conflictError } : {}),
          onLoadLatest: () => {
            setActionError(null);
            updateMutation.reset();
            completeMutation.reset();
            changeStatusMutation.reset();
            archiveMutation.reset();
            restoreMutation.reset();
            void detailQuery.refetch();
          },
          onEdit: () => setEditOpen(true),
          onStartFocus: () => onNavigate(`/life-os/app/focus?taskId=${encodeURIComponent(taskId)}`),
          onToggleMit: () =>
            void runAction(
              () =>
                mitMutation.mutateAsync({
                  task: canonicalTask,
                  date: canonicalTask.mitDate ?? todayLocalDate(timeZone),
                }),
              canonicalTask.isMit ? "MIT removed." : "MIT set for today.",
            ),
          onMarkDone: () =>
            void runAction(
              () => completeMutation.mutateAsync({ id: taskId, version: detail?.version ?? 0 }),
              "Task marked done.",
            ),
          onReopen: () =>
            void runAction(
              () =>
                changeStatusMutation.mutateAsync({
                  id: taskId,
                  status: "TO_DO",
                  version: detail?.version ?? 0,
                }),
              "Task reopened.",
            ),
          onDuplicate: () =>
            void runAction(() => duplicateMutation.mutateAsync(taskId), "Task duplicated."),
          onArchive: () => setDestructiveAction("archive"),
          onRestore: () =>
            void runAction(
              () => restoreMutation.mutateAsync({ id: taskId, version: detail?.version ?? 0 }),
              "Task restored.",
            ),
          onDelete: () => setDestructiveAction("delete"),
        }
      : {},
    subtasks: {
      subtasks: detail?.subtasks ?? [],
      onAdd: (title) => detailMutations.addSubtask.mutateAsync(title).then(() => undefined),
      onEdit: (subtaskId, title) =>
        detailMutations.editSubtask.mutateAsync({ subtaskId, title }).then(() => undefined),
      onToggle: (subtaskId, completed) =>
        detailMutations.toggleSubtask.mutateAsync({ subtaskId, completed }).then(() => undefined),
      onReorder: (subtaskIds) =>
        detailMutations.reorderSubtasks.mutateAsync(subtaskIds).then(() => undefined),
      onDelete: (subtaskId) =>
        detailMutations.deleteSubtask.mutateAsync(subtaskId).then(() => undefined),
    },
    dependencies: {
      blockers: detail?.blockers ?? [],
      dependents: detail?.dependents ?? [],
      blockerOptions,
      searchLoading: candidateQuery.isFetching,
      onSearchQueryChange: setBlockerQuery,
      onAddBlocker: (targetTaskId) =>
        detailMutations.addBlocker.mutateAsync(targetTaskId).then(() => undefined),
      onRemoveDependency: (targetTaskId, relationship) =>
        detailMutations.removeDependency
          .mutateAsync({ targetTaskId, relationship })
          .then(() => undefined),
      onOpenTask: (targetTaskId) =>
        onNavigate(`/life-os/app/tasks/${targetTaskId}?returnTo=${encodeURIComponent(backHref)}`),
    },
    scheduling: {
      spentMinutes: canonicalTask?.spentMinutes ?? null,
      onSchedule: () => onNavigate(`/life-os/app/time-blocks?taskId=${encodeURIComponent(taskId)}`),
      onStartFocus: () => onNavigate(`/life-os/app/focus?taskId=${encodeURIComponent(taskId)}`),
    },
    comments: {
      comments: visibleComments,
      count:
        (commentsQuery.data?.total ?? detail?.counts.commentCount ?? 0) + (pendingComment ? 1 : 0),
      status: commentsQuery.isError
        ? {
            type: "error",
            message: "Task comments couldn't load. Task details are still available.",
            onRetry: () => void commentsQuery.refetch(),
          }
        : commentsQuery.isPending && pendingComment === null
          ? { type: "loading" }
          : { type: "ready" },
      addPending: commentMutations.add.isPending,
      ...(addCommentError ? { addError: addCommentError } : {}),
      onAdd: async (body) => {
        setCommentPage(1);
        setPendingComment({ body, createdAt: new Date().toISOString() });
        try {
          await commentMutations.add.mutateAsync(body);
        } finally {
          setPendingComment(null);
        }
      },
      onEdit: (id, body) => {
        const current = commentById.get(id);
        if (!current?.canEdit) return;
        void commentMutations.edit
          .mutateAsync({ id, body, version: current.version })
          .catch(() => undefined);
      },
      editPending: commentMutations.edit.isPending,
      ...(editCommentError ? { editError: editCommentError } : {}),
      onDelete: (id) => {
        const current = commentById.get(id);
        if (!current?.canDelete) return;
        void commentMutations.remove
          .mutateAsync({ id, version: current.version })
          .catch(() => undefined);
      },
      deletePending: commentMutations.remove.isPending,
      ...(deleteCommentError ? { deleteError: deleteCommentError } : {}),
      page: commentsQuery.data?.page ?? commentPage,
      pageSize: commentsQuery.data?.pageSize ?? COMMENT_PAGE_SIZE,
      total: commentsQuery.data?.total ?? 0,
      onPageChange: setCommentPage,
    },
    attachments: {
      enabled: false,
      count: detail?.counts.attachmentCount ?? 0,
    },
    activity: {
      events: activityEvents,
      count: detail?.counts.activityEventCount ?? 0,
      status: activityQuery.isError
        ? {
            type: "error",
            message: "Task activity couldn't load. Task details are still available.",
            onRetry: () => void activityQuery.refetch(),
          }
        : activityQuery.isPending
          ? { type: "loading" }
          : { type: "ready" },
      page: (activityQuery.data?.page ?? activityPage - 1) + 1,
      pageSize: activityQuery.data?.size ?? ACTIVITY_PAGE_SIZE,
      total: activityQuery.data?.totalItems ?? 0,
      onPageChange: setActivityPage,
      filter: activityFilter,
      onFilterChange: setActivityFilter,
      emptyTitle: activityFilterEmptyTitle(activityFilter),
    },
  };

  const details =
    presentation === "sheet" ? (
      <TaskDetailsSheet open={open} onClose={onClose ?? (() => undefined)} {...screenProps} />
    ) : (
      <TaskDetailsScreen {...screenProps} />
    );

  const formError =
    updateMutation.error && !isApiStatus(updateMutation.error, 409)
      ? "We couldn't save this Task. Your changes are still here. Try again."
      : undefined;

  return (
    <>
      {details}
      <TaskForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={async (data) => {
          await updateMutation.mutateAsync({
            id: taskId,
            request: toUpdateRequest(data, detail?.version ?? data.version ?? 0),
          });
          setEditOpen(false);
          onMutationSuccess?.("Task saved.");
        }}
        mode="edit"
        timeZone={timeZone}
        locale={locale}
        projects={projectOptions}
        labels={labelsQuery.data ?? []}
        labelsLoading={labelsQuery.isPending}
        isPending={updateMutation.isPending}
        {...(formError ? { error: formError } : {})}
        {...(conflictError ? { conflictError } : {})}
        onReloadLatest={() => {
          updateMutation.reset();
          void detailQuery.refetch();
        }}
        initialValues={
          canonicalTask
            ? {
                id: canonicalTask.id,
                projectId: canonicalTask.project?.id ?? null,
                title: canonicalTask.title,
                description: canonicalTask.description,
                status: canonicalTask.status,
                priority: canonicalTask.priority,
                dueAt: canonicalTask.dueAt,
                estimateMinutes: canonicalTask.estimateMinutes,
                progress: canonicalTask.progress,
                mitDate: canonicalTask.mitDate,
                labelIds: canonicalTask.labelIds,
                version: detail?.version ?? canonicalTask.version,
              }
            : null
        }
      />
      <ConfirmDialog
        open={destructiveAction !== null}
        onClose={() => {
          if (!archiveMutation.isPending && !deleteMutation.isPending) {
            setDestructiveAction(null);
          }
        }}
        onConfirm={() => {
          if (destructiveAction === "archive") {
            void archiveMutation
              .mutateAsync({ id: taskId, version: detail?.version ?? 0 })
              .then(() => {
                setDestructiveAction(null);
                onMutationSuccess?.("Task archived.");
              })
              .catch(() => undefined);
          } else if (destructiveAction === "delete") {
            void deleteMutation
              .mutateAsync(taskId)
              .then(() => {
                setDestructiveAction(null);
                onMutationSuccess?.("Task deleted.");
                onDeleted?.();
              })
              .catch(() => undefined);
          }
        }}
        title={
          destructiveAction === "delete"
            ? `Delete “${canonicalTask?.title ?? "Task"}”?`
            : `Archive “${canonicalTask?.title ?? "Task"}”?`
        }
        description={
          destructiveAction === "delete"
            ? "This Task will be removed from active views. Its recoverable data follows the account retention policy."
            : "The Task will leave active views. You can restore it from Archived."
        }
        confirmLabel={destructiveAction === "delete" ? "Delete task" : "Archive task"}
        pending={archiveMutation.isPending || deleteMutation.isPending}
        pendingLabel={destructiveAction === "delete" ? "Deleting task" : "Archiving task"}
        {...(archiveMutation.error || deleteMutation.error
          ? { error: "We couldn't change this Task. It remains available. Try again." }
          : {})}
      />
    </>
  );
}
