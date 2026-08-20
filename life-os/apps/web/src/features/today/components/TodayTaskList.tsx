import { EmptyState, ErrorState } from "@components/feedback";
import { DataTable, type DataTableColumn } from "@components/navigation";
import {
  Badge,
  Button,
  Link,
  LiveRegion,
  PRIORITY_TONE,
  SkeletonTable,
  Surface,
  TASK_STATUS_TONE,
  Text,
  VisuallyHidden,
} from "@components/ui";

import {
  TODAY_PLAN_PRIORITY_LABEL,
  TODAY_PLAN_STATUS_LABEL,
  type TodayPlanTask,
  type TodayTaskListState,
} from "../model/todayPlan";
import { TodayTaskActions } from "./TodayTaskActions";

export interface TodayTaskListProps {
  readonly state: TodayTaskListState;
  readonly tasksHref: string;
  readonly onAddTask: () => void;
  readonly onSetMit: (taskId: string) => void;
  readonly onMarkDone: (taskId: string) => void;
  readonly onStartFocus: (taskId: string) => void;
  readonly onRetry?: () => void;
}

function ProjectContext({ task }: { readonly task: TodayPlanTask }) {
  if (!task.project) {
    return (
      <Text tone="muted" size="sm">
        No project
      </Text>
    );
  }

  return task.project.href ? (
    <Link href={task.project.href} quiet>
      {task.project.name}
    </Link>
  ) : (
    <Text tone="secondary" size="sm">
      {task.project.name}
    </Text>
  );
}

function TaskTitle({ task }: { readonly task: TodayPlanTask }) {
  return (
    <div className="lifeos-today-task__title-cell">
      <Link href={task.href}>{task.title}</Link>
      <div className="lifeos-today-task__inline-badges">
        {task.isMit ? (
          <Badge tone="accent">
            MIT<VisuallyHidden> — Most Important Task</VisuallyHidden>
          </Badge>
        ) : null}
        <Badge tone={TASK_STATUS_TONE[task.status] ?? "neutral"}>
          {TODAY_PLAN_STATUS_LABEL[task.status]}
        </Badge>
      </div>
      {task.dueLabel ? (
        <Text tone="secondary" size="sm">
          {task.dueLabel}
        </Text>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  onSetMit,
  onMarkDone,
  onStartFocus,
}: {
  readonly task: TodayPlanTask;
  readonly onSetMit: (taskId: string) => void;
  readonly onMarkDone: (taskId: string) => void;
  readonly onStartFocus: (taskId: string) => void;
}) {
  return (
    <Surface padding="sm" interactive className="lifeos-today-task-card">
      <TaskTitle task={task} />
      <div className="lifeos-today-task-card__meta">
        <ProjectContext task={task} />
        <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>
          {TODAY_PLAN_PRIORITY_LABEL[task.priority]}
        </Badge>
      </div>
      <TodayTaskActions
        task={task}
        onSetMit={onSetMit}
        onMarkDone={onMarkDone}
        onStartFocus={onStartFocus}
      />
    </Surface>
  );
}

export function TodayTaskList({
  state,
  tasksHref,
  onAddTask,
  onSetMit,
  onMarkDone,
  onStartFocus,
  onRetry,
}: TodayTaskListProps) {
  const columns: readonly DataTableColumn<TodayPlanTask>[] = [
    { key: "task", header: "Task", render: (task) => <TaskTitle task={task} />, truncate: true },
    { key: "project", header: "Project", render: (task) => <ProjectContext task={task} /> },
    {
      key: "priority",
      header: "Priority",
      render: (task) => (
        <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>
          {TODAY_PLAN_PRIORITY_LABEL[task.priority]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (task) => (
        <TodayTaskActions
          task={task}
          compact
          onSetMit={onSetMit}
          onMarkDone={onMarkDone}
          onStartFocus={onStartFocus}
        />
      ),
    },
  ];

  return (
    <Surface as="section" title="Today's tasks" titleLevel={3} className="lifeos-today-task-list">
      {state.type === "loading" ? (
        <div className="lifeos-today-task-list__loading">
          <LiveRegion message="Loading today's tasks…" />
          <SkeletonTable rows={4} columns={4} />
        </div>
      ) : state.type === "error" ? (
        <ErrorState
          scope="region"
          title="Today's tasks couldn't load."
          description={state.message}
          {...(onRetry ? { onRetry } : {})}
          action={<Link href={tasksHref}>Open Tasks</Link>}
        />
      ) : state.type === "empty" || state.tasks.length === 0 ? (
        <EmptyState
          variant="first-use"
          title="No tasks planned for today"
          description="Add a Task when you know what needs attention today."
          primaryAction={<Button onClick={onAddTask}>Add task</Button>}
          secondaryAction={<Link href={tasksHref}>View all tasks</Link>}
        />
      ) : (
        <>
          <DataTable
            label="Today's tasks"
            columns={columns}
            rows={state.tasks}
            getRowId={(task) => task.id}
            getRowLabel={(task) => task.title}
            emptyTitle="No tasks planned for today"
            density="compact"
            renderCard={(task) => (
              <TaskCard
                task={task}
                onSetMit={onSetMit}
                onMarkDone={onMarkDone}
                onStartFocus={onStartFocus}
              />
            )}
          />
          <div className="lifeos-today-task-list__footer">
            <Button variant="secondary" onClick={onAddTask}>
              Add task
            </Button>
            <Link href={tasksHref}>View all tasks</Link>
          </div>
        </>
      )}
    </Surface>
  );
}
