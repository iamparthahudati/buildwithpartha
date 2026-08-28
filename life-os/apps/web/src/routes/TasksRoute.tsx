import { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useProjects, type Project } from "@features/projects";
import {
  applyTasksViewTab,
  DEFAULT_TASK_SORT,
  readTasksViewTab,
  TasksScreen,
  useArchiveTask,
  useBulkTaskAction,
  useChangeTaskStatus,
  useCompleteTask,
  useCreateTask,
  useDeleteTask,
  useDuplicateTask,
  useRestoreTask,
  useTasks,
  useTaskLabels,
  useToggleTaskMit,
  useUpdateTask,
  isConflict,
  IntegratedTaskDetails,
  type BulkActionOutcome,
  type BulkTaskAction,
  type TaskFormData,
  type TaskProjectContext,
  type TaskQueryParams,
  type TasksViewMode,
  type TasksViewTab,
  type TaskSortState,
  type TaskDetailsTabId,
} from "@features/tasks";
import { todayLocalDate } from "@lib/localDateTime";
import { useAuthSession } from "@state/authSession";
import { useToast } from "@state/toastQueue";

const PAGE_SIZE = 10;
const VIEW_MODES = new Set<TasksViewMode>(["list", "grid", "table"]);
const TASK_DETAIL_TABS = new Set<TaskDetailsTabId>([
  "details",
  "subtasks",
  "dependencies",
  "comments",
  "activity",
]);

function toSearchParamsInit(params: URLSearchParams): Record<string, string> {
  return Object.fromEntries(params.entries());
}

function isViewMode(value: string | null): value is TasksViewMode {
  return value !== null && VIEW_MODES.has(value as TasksViewMode);
}

export function TasksRoute() {
  const { user } = useAuthSession();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [bulkOutcome, setBulkOutcome] = useState<BulkActionOutcome | null>(null);

  const tab = (readTasksViewTab(searchParams) ?? "ALL") as TasksViewTab;
  const searchQuery = searchParams.get("q") ?? "";
  const priorityFilter = searchParams.get("priority") ?? "ALL";
  const projectFilter = searchParams.get("projectId") ?? "ALL";
  const sortOptionId = searchParams.get("sortBy") ?? DEFAULT_TASK_SORT.optionId;
  const sortDirection = (searchParams.get("sortDirection") === "ASC" ? "asc" : "desc") as
    "asc" | "desc";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const viewParam = searchParams.get("view");
  const viewMode: TasksViewMode = isViewMode(viewParam) ? viewParam : "table";
  const selectedTaskId = searchParams.get("selected");
  const selectedTaskTab = TASK_DETAIL_TABS.has(searchParams.get("taskTab") as TaskDetailsTabId)
    ? (searchParams.get("taskTab") as TaskDetailsTabId)
    : "details";

  const listContextHref = useMemo(() => {
    const contextParams = new URLSearchParams(searchParams);
    contextParams.delete("selected");
    contextParams.delete("taskTab");
    const query = contextParams.toString();
    return `${location.pathname}${query ? `?${query}` : ""}`;
  }, [location.pathname, searchParams]);

  const apiQueryParams: TaskQueryParams = useMemo(() => {
    const isArchived = tab === "ARCHIVED";
    const statuses = tab !== "ALL" && tab !== "OVERDUE" && tab !== "ARCHIVED" ? [tab] : undefined;

    return {
      ...(searchQuery ? { q: searchQuery } : {}),
      ...(projectFilter !== "ALL" && projectFilter !== "NONE" ? { projectId: projectFilter } : {}),
      ...(statuses ? { status: statuses } : {}),
      ...(priorityFilter !== "ALL" ? { priority: [priorityFilter] } : {}),
      ...(tab === "OVERDUE" ? { overdue: true } : {}),
      archived: isArchived,
      page: currentPage - 1,
      size: PAGE_SIZE,
      sortBy: sortOptionId,
      sortDirection: sortDirection === "asc" ? "ASC" : "DESC",
    };
  }, [tab, searchQuery, projectFilter, priorityFilter, currentPage, sortOptionId, sortDirection]);

  const projectsQuery = useProjects({ size: 100, archived: false }, user !== null);
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
      (projectsQuery.data?.items ?? []).map((project: Project) => ({
        id: project.id,
        name: project.name,
      })),
    [projectsQuery.data?.items],
  );

  const tasksQuery = useTasks(apiQueryParams, user !== null, projectById);
  const labelsQuery = useTaskLabels(user !== null);

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const completeMutation = useCompleteTask();
  const changeStatusMutation = useChangeTaskStatus();
  const archiveMutation = useArchiveTask();
  const restoreMutation = useRestoreTask();
  const deleteMutation = useDeleteTask();
  const duplicateMutation = useDuplicateTask();
  const mitMutation = useToggleTaskMit();
  const bulkMutation = useBulkTaskAction();

  const pendingUrlMutations = useRef<Array<(next: URLSearchParams) => void>>([]);
  const updateUrlParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      pendingUrlMutations.current.push(mutate);
      queueMicrotask(() => {
        const mutations = pendingUrlMutations.current;
        if (mutations.length === 0) {
          return;
        }
        pendingUrlMutations.current = [];
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            for (const apply of mutations) {
              apply(next);
            }
            return toSearchParamsInit(next);
          },
          { replace: true },
        );
      });
    },
    [setSearchParams],
  );

  const tasksList = useMemo(
    () =>
      (tasksQuery.data?.items ?? []).map((task) => {
        const href = `/life-os/app/tasks/${task.id}?returnTo=${encodeURIComponent(listContextHref)}`;
        if (!task.project) return { ...task, href };
        const resolved = projectById.get(task.project.id);
        return resolved ? { ...task, project: resolved, href } : { ...task, href };
      }),
    [tasksQuery.data?.items, projectById, listContextHref],
  );

  const summary = tasksQuery.data?.summary;
  const summaryStatus = tasksQuery.isPending
    ? ({ type: "loading" } as const)
    : tasksQuery.isError
      ? {
          type: "error" as const,
          message: tasksQuery.error?.message ?? "We couldn't load task counts.",
          onRetry: () => void tasksQuery.refetch(),
        }
      : summary && summary.total === 0
        ? ({ type: "empty" } as const)
        : summary
          ? ({ type: "ready" as const, counts: summary } as const)
          : ({ type: "loading" } as const);

  const saveError = createMutation.error ?? updateMutation.error;
  const formConflictError = isConflict(saveError)
    ? "A newer version is available. Reload it before continuing."
    : undefined;
  const formError = formConflictError ? undefined : saveError?.message;

  function toCreateRequest(data: TaskFormData) {
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
    };
  }

  if (user === null) {
    return null;
  }

  return (
    <>
      <TasksScreen
        tasks={tasksList}
        summaryStatus={summaryStatus}
        loading={tasksQuery.isPending}
        error={
          tasksQuery.isError
            ? (tasksQuery.error?.message ?? "We couldn't load this task list.")
            : null
        }
        tab={tab}
        searchQuery={searchQuery}
        priorityFilter={priorityFilter}
        projectFilter={projectFilter}
        sortState={{ optionId: sortOptionId, direction: sortDirection } satisfies TaskSortState}
        viewMode={viewMode}
        currentPage={currentPage}
        totalItems={tasksQuery.data?.page.totalItems ?? 0}
        pageSize={PAGE_SIZE}
        selectedIds={selectedIds}
        selectedTask={null}
        projects={projectOptions}
        labels={labelsQuery.data ?? []}
        bulkOutcome={bulkOutcome}
        formPending={createMutation.isPending || updateMutation.isPending}
        {...(formError ? { formError } : {})}
        {...(formConflictError ? { formConflictError } : {})}
        onTabChange={(next) => {
          updateUrlParams((params) => {
            const applied = applyTasksViewTab(params, next);
            for (const key of [...params.keys()]) {
              params.delete(key);
            }
            applied.forEach((value, key) => params.append(key, value));
          });
        }}
        onSearchQueryChange={(query) => {
          updateUrlParams((params) => {
            if (query) params.set("q", query);
            else params.delete("q");
            params.delete("page");
          });
        }}
        onPriorityFilterChange={(priority) => {
          updateUrlParams((params) => {
            if (priority === "ALL") params.delete("priority");
            else params.set("priority", priority);
            params.delete("page");
          });
        }}
        onProjectFilterChange={(projectId) => {
          updateUrlParams((params) => {
            if (projectId === "ALL" || projectId === "NONE") params.delete("projectId");
            else params.set("projectId", projectId);
            params.delete("page");
          });
        }}
        onSortChange={(sort) => {
          updateUrlParams((params) => {
            if (sort.optionId === DEFAULT_TASK_SORT.optionId) params.delete("sortBy");
            else params.set("sortBy", sort.optionId);
            if (sort.direction === "desc") params.delete("sortDirection");
            else params.set("sortDirection", "ASC");
          });
        }}
        onViewModeChange={(mode) => {
          updateUrlParams((params) => {
            if (mode === "table") params.delete("view");
            else params.set("view", mode);
          });
        }}
        onPageChange={(page) => {
          updateUrlParams((params) => {
            if (page <= 1) params.delete("page");
            else params.set("page", String(page));
          });
        }}
        onSelectedIdsChange={setSelectedIds}
        onSelectTask={(task) => {
          updateUrlParams((params) => {
            if (task) params.set("selected", task.id);
            else params.delete("selected");
          });
        }}
        onRetry={() => void tasksQuery.refetch()}
        onReloadLatest={() => {
          createMutation.reset();
          updateMutation.reset();
          void tasksQuery.refetch();
        }}
        onCreateTask={async (data) => {
          await createMutation.mutateAsync(toCreateRequest(data));
          toast.push({ tone: "success", message: "Task added." });
        }}
        onUpdateTask={async (id, data) => {
          const existing = tasksList.find((task) => task.id === id);
          await updateMutation.mutateAsync({
            id,
            request: {
              ...toCreateRequest(data),
              version: existing?.version ?? data.version ?? 1,
            },
          });
          toast.push({ tone: "success", message: "Task saved." });
        }}
        onArchiveTask={async (task) => {
          await archiveMutation.mutateAsync({ id: task.id, version: task.version });
          toast.push({ tone: "success", message: "Task archived." });
        }}
        onRestoreTask={async (task) => {
          await restoreMutation.mutateAsync({ id: task.id, version: task.version });
          toast.push({ tone: "success", message: "Task restored." });
        }}
        onDeleteTask={async (task) => {
          await deleteMutation.mutateAsync(task.id);
          if (selectedTaskId === task.id) {
            updateUrlParams((params) => params.delete("selected"));
          }
          toast.push({ tone: "success", message: "Task deleted." });
        }}
        onDuplicateTask={async (task) => {
          await duplicateMutation.mutateAsync(task.id);
          toast.push({ tone: "success", message: "Task duplicated." });
        }}
        onMarkDone={async (task) => {
          await completeMutation.mutateAsync({ id: task.id, version: task.version });
          toast.push({ tone: "success", message: "Task marked done." });
        }}
        onReopen={async (task) => {
          await changeStatusMutation.mutateAsync({
            id: task.id,
            status: "TO_DO",
            version: task.version,
          });
          toast.push({ tone: "success", message: "Task reopened." });
        }}
        onToggleMit={async (task) => {
          await mitMutation.mutateAsync({
            task,
            date: task.mitDate ?? todayLocalDate(user.timeZone),
          });
          toast.push({
            tone: "success",
            message: task.isMit ? "MIT removed." : "MIT set for today.",
          });
        }}
        onBulkAction={async (ids, action: BulkTaskAction) => {
          const titlesById = new Map(tasksList.map((task) => [task.id, task.title]));
          const outcome = await bulkMutation.mutateAsync({
            taskIds: ids,
            action,
            titlesById,
          });
          setBulkOutcome(outcome.failed.length > 0 ? outcome : null);
          setSelectedIds(new Set(outcome.failed.map((item) => item.taskId)));
          if (outcome.failed.length === 0) {
            toast.push({ tone: "success", message: "Selected tasks updated." });
          } else if (outcome.succeeded > 0) {
            toast.push({
              tone: "warning",
              message: `${outcome.succeeded} updated. ${outcome.failed.length} could not be changed.`,
            });
          }
          return outcome;
        }}
        onDismissBulkOutcome={() => setBulkOutcome(null)}
        timeZone={user.timeZone}
        locale={user.locale}
      />
      {selectedTaskId ? (
        <IntegratedTaskDetails
          taskId={selectedTaskId}
          initialTask={tasksList.find((task) => task.id === selectedTaskId)}
          presentation="sheet"
          open
          onClose={() => {
            updateUrlParams((params) => {
              params.delete("selected");
              params.delete("taskTab");
            });
          }}
          selectedTab={selectedTaskTab}
          onTabChange={(nextTab) => {
            updateUrlParams((params) => {
              if (nextTab === "details") params.delete("taskTab");
              else params.set("taskTab", nextTab);
            });
          }}
          backHref={listContextHref}
          locale={user.locale}
          timeZone={user.timeZone}
          authorId={user.id}
          authorName={user.displayName}
          onNavigate={(href) => navigate(href)}
          onDeleted={() => {
            updateUrlParams((params) => {
              params.delete("selected");
              params.delete("taskTab");
            });
          }}
          onMutationSuccess={(message) => toast.push({ tone: "success", message })}
        />
      ) : null}
    </>
  );
}
