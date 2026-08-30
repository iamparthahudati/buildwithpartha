import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useProjects } from "@features/projects";
import {
  mapSprintResponse,
  SprintsScreen,
  useAddSprintTask,
  useCompleteSprint,
  useCreateSprint,
  useRemoveSprintTask,
  useSprint,
  useSprints,
  useStartSprint,
  useUpdateSprint,
  useUpdateSprintTask,
  type Sprint,
  type SprintRetrospectiveData,
  type SprintTaskContext,
  type SprintsView,
} from "@features/sprints";
import { useTasks, type TaskProjectContext } from "@features/tasks";
import { useAuthSession } from "@state/authSession";
import { useToast } from "@state/toastQueue";

const VALID_VIEWS = new Set<SprintsView>(["active", "upcoming", "completed"]);

function viewForStatus(status: Sprint["status"] | undefined): SprintsView {
  if (status === "PLANNED") return "upcoming";
  if (status === "COMPLETED" || status === "CANCELLED") return "completed";
  return "active";
}

export function SprintsRoute() {
  const { user } = useAuthSession();
  const toast = useToast();
  const navigate = useNavigate();
  const { sprintId } = useParams<{ sprintId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

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

  const tasksQuery = useTasks(
    { page: 0, size: 100, archived: false, sortBy: "updatedAt", sortDirection: "DESC" },
    user !== null,
    projectById,
  );
  const sprintsQuery = useSprints([], user !== null);
  const sprintDetailQuery = useSprint(sprintId ?? null, user !== null && sprintId !== undefined);

  const taskContextById = useMemo(() => {
    const map = new Map<string, SprintTaskContext>();
    for (const task of tasksQuery.data?.items ?? []) {
      const projectName = task.project
        ? (projectById.get(task.project.id)?.name ?? task.project.name)
        : undefined;
      map.set(task.id, {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        ...(projectName ? { projectName } : {}),
      });
    }
    return map;
  }, [tasksQuery.data?.items, projectById]);

  const records = useMemo(() => {
    const byId = new Map((sprintsQuery.data ?? []).map((sprint) => [sprint.id, sprint]));
    if (sprintDetailQuery.data) byId.set(sprintDetailQuery.data.id, sprintDetailQuery.data);
    return [...byId.values()]
      .filter((sprint) => sprint.status !== "CANCELLED")
      .map((sprint) => mapSprintResponse(sprint, taskContextById));
  }, [sprintsQuery.data, sprintDetailQuery.data, taskContextById]);

  const selectedSprintId = sprintId ?? searchParams.get("selected");
  const selectedRecord = selectedSprintId
    ? records.find((record) => record.sprint.id === selectedSprintId)
    : undefined;
  const requestedView = searchParams.get("view");
  const view = VALID_VIEWS.has(requestedView as SprintsView)
    ? (requestedView as SprintsView)
    : viewForStatus(selectedRecord?.sprint.status);

  const createMutation = useCreateSprint();
  const updateMutation = useUpdateSprint();
  const addTaskMutation = useAddSprintTask();
  const updateTaskMutation = useUpdateSprintTask();
  const removeTaskMutation = useRemoveSprintTask();
  const startMutation = useStartSprint();
  const completeMutation = useCompleteSprint();
  const mutations = [
    createMutation,
    updateMutation,
    addTaskMutation,
    updateTaskMutation,
    removeTaskMutation,
    startMutation,
    completeMutation,
  ] as const;
  const actionPending = mutations.some((mutation) => mutation.isPending);
  const actionError = mutations.find((mutation) => mutation.error)?.error?.message;

  function updateSearchParams(updates: Record<string, string | null>) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return Object.fromEntries(next.entries());
      },
      { replace: true },
    );
  }

  function versionOf(sprint: Sprint): number {
    return sprint.version ?? 0;
  }

  if (user === null) return null;

  return (
    <SprintsScreen
      records={records}
      loading={
        sprintsQuery.isPending ||
        tasksQuery.isPending ||
        (sprintId !== undefined && sprintDetailQuery.isPending)
      }
      error={
        sprintsQuery.error?.message ??
        tasksQuery.error?.message ??
        (sprintId !== undefined ? sprintDetailQuery.error?.message : undefined) ??
        null
      }
      view={view}
      selectedSprintId={selectedSprintId}
      taskOptions={(tasksQuery.data?.items ?? [])
        .filter((task) => task.status !== "DONE" && task.status !== "CANCELLED")
        .map((task) => {
          const projectName = task.project
            ? (projectById.get(task.project.id)?.name ?? task.project.name)
            : undefined;
          return {
            id: task.id,
            label: projectName ? `${task.title} — ${projectName}` : task.title,
            ...(task.project && projectName ? { projectId: task.project.id, projectName } : {}),
          };
        })}
      actionPending={actionPending}
      {...(actionError ? { actionError } : {})}
      locale={user.locale}
      timeZone={user.timeZone}
      onRetry={() => {
        void sprintsQuery.refetch();
        void tasksQuery.refetch();
        if (sprintId) void sprintDetailQuery.refetch();
      }}
      onViewChange={(nextView) => {
        if (sprintId) {
          navigate(`/life-os/app/sprints${nextView === "active" ? "" : `?view=${nextView}`}`);
          return;
        }
        updateSearchParams({ view: nextView === "active" ? null : nextView, selected: null });
      }}
      onSelectSprint={(id) => {
        if (!sprintId) updateSearchParams({ selected: id });
      }}
      onCreateSprint={async (data) => {
        const created = await createMutation.mutateAsync({
          name: data.name,
          goal: data.goal ?? null,
          startDate: data.startDate,
          endDate: data.endDate,
          targetCapacityPoints: data.targetCapacityPoints,
          tasks: [],
        });
        updateSearchParams({ view: "upcoming", selected: created.id });
        toast.push({ tone: "success", message: "Sprint planned." });
      }}
      onUpdateSprint={async (sprint, data) => {
        await updateMutation.mutateAsync({
          id: sprint.id,
          request: {
            name: data.name,
            goal: data.goal ?? null,
            startDate: data.startDate,
            endDate: data.endDate,
            targetCapacityPoints: data.targetCapacityPoints,
            version: versionOf(sprint),
          },
        });
        toast.push({ tone: "success", message: "Sprint details saved." });
      }}
      onStartSprint={async (sprint) => {
        await startMutation.mutateAsync({ id: sprint.id, version: versionOf(sprint) });
        updateSearchParams({ view: null, selected: sprint.id });
        toast.push({ tone: "success", message: "Sprint started." });
      }}
      onAddTask={async (sprint, data, position) => {
        await addTaskMutation.mutateAsync({
          id: sprint.id,
          request: {
            taskId: data.taskId,
            storyPoints: data.storyPoints,
            position,
            reason: data.reason ?? null,
            version: versionOf(sprint),
          },
        });
        toast.push({ tone: "success", message: "Task added to Sprint." });
      }}
      onUpdateTask={async (sprint, task, data, position) => {
        await updateTaskMutation.mutateAsync({
          id: sprint.id,
          taskId: task.taskId,
          request: {
            storyPoints: data.storyPoints,
            position,
            reason: data.reason ?? null,
            version: versionOf(sprint),
          },
        });
        toast.push({ tone: "success", message: "Sprint commitment updated." });
      }}
      onRemoveTask={async (sprint, task) => {
        await removeTaskMutation.mutateAsync({
          id: sprint.id,
          taskId: task.taskId,
          request: { reason: null, version: versionOf(sprint) },
        });
        toast.push({ tone: "success", message: "Task removed from Sprint." });
      }}
      onCompleteSprint={async (sprint, data: SprintRetrospectiveData) => {
        const target = data.targetSprintId
          ? records.find((record) => record.sprint.id === data.targetSprintId)?.sprint
          : undefined;
        await completeMutation.mutateAsync({
          id: sprint.id,
          request: {
            retrospectiveNotes: data.retrospectiveNotes ?? null,
            whatWentWell: data.whatWentWell ?? null,
            whatCouldBeImproved: data.whatCouldBeImproved ?? null,
            actionItems: data.actionItems ?? [],
            carryOverDestination: data.carryOverDestination ?? "BACKLOG",
            ...(target ? { targetSprintId: target.id, targetVersion: versionOf(target) } : {}),
            version: versionOf(sprint),
          },
        });
        updateSearchParams({ view: "completed", selected: sprint.id });
        toast.push({ tone: "success", message: "Sprint completed." });
      }}
    />
  );
}
