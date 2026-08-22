import { Alert } from "@components/feedback";
import { PageHeader, type BreadcrumbItem } from "@components/navigation";
import {
  Badge,
  Button,
  Link,
  ProgressBar,
  Skeleton,
  Surface,
  VisuallyHidden,
} from "@components/ui";
import { formatDurationMinutes } from "@lib/duration";

import type { TaskPriority, TaskProjectContext, TaskStatus } from "../model/task";
import {
  formatTaskDueAt,
  isTaskOverdue,
  readTaskProgress,
  TASK_PRIORITY_BADGE_TONE,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_BADGE_TONE,
  TASK_STATUS_LABEL,
} from "../model/taskPresentation";
import { TaskActions, type TaskActionCallbacks } from "./TaskActions";
import "./task-details-header.css";

export interface TaskDetailsLabel {
  readonly id: string;
  readonly name: string;
}

/**
 * The Task projection the details header needs (LOS-0814).
 *
 * This stays separate from the list projection: comment counts belong to a
 * TaskRow, while Estimate, Time spent and resolved Label names belong here.
 * LOS-0819 can map its aggregate response into this shape without either
 * component pretending to own the canonical API DTO.
 */
export interface TaskDetailsHeaderTask {
  readonly id: string;
  readonly title: string;
  readonly description?: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly project?: TaskProjectContext | null;
  /** UTC instant from the API; formatted only in the confirmed user timezone. */
  readonly dueAt?: string | null;
  readonly estimateMinutes?: number | null;
  readonly spentMinutes?: number | null;
  readonly progress: number;
  readonly labels?: readonly TaskDetailsLabel[];
  readonly isMit?: boolean;
  readonly blockerCount?: number;
  readonly overdue?: boolean;
  readonly archivedAt?: string | null;
  readonly deletedAt?: string | null;
}

export interface TaskDetailsHeaderProps extends TaskActionCallbacks {
  readonly task?: TaskDetailsHeaderTask;
  readonly loading?: boolean;
  /** Supports a not-found response that knows the Task was soft-deleted but has no projection. */
  readonly deleted?: boolean;
  /** Safe, user-facing detail for an optimistic-concurrency conflict. */
  readonly conflictError?: string;
  readonly onLoadLatest?: () => void;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly backHref?: string;
  readonly backLabel?: string;
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  readonly className?: string;
}

const DEFAULT_CONFLICT_MESSAGE =
  "The details shown here may be out of date. Load the latest Task before making more changes.";

export function TaskDetailsHeader({
  task,
  loading = false,
  deleted = false,
  conflictError,
  onLoadLatest,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  backHref = "/life-os/app/tasks",
  backLabel = "Tasks",
  breadcrumbs: customBreadcrumbs,
  className,
  ...actions
}: TaskDetailsHeaderProps) {
  if (loading || (!task && !deleted)) {
    return <TaskDetailsHeaderSkeleton {...(className ? { className } : {})} />;
  }

  const isDeleted = deleted || Boolean(task?.deletedAt);
  const title = task?.title ?? "Task unavailable";
  const breadcrumbs: readonly BreadcrumbItem[] = customBreadcrumbs ?? [
    { label: backLabel, href: backHref },
    { label: title, href: task ? `${backHref}/${task.id}` : backHref },
  ];

  if (!task) {
    return (
      <Surface
        className={["lifeos-task-details-header", "lifeos-task-details-header--deleted", className]
          .filter(Boolean)
          .join(" ")}
      >
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <Alert tone="warning" heading="This task was deleted">
          <p>This Task is no longer available. Return to Tasks to continue.</p>
        </Alert>
      </Surface>
    );
  }

  const isArchived = Boolean(task.archivedAt);
  const taskForPresentation = {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    commentCount: 0,
    ...(task.project !== undefined ? { project: task.project } : {}),
    ...(task.dueAt !== undefined ? { dueAt: task.dueAt } : {}),
    ...(task.isMit !== undefined ? { isMit: task.isMit } : {}),
    ...(task.blockerCount !== undefined ? { blockerCount: task.blockerCount } : {}),
    ...(task.overdue !== undefined ? { overdue: task.overdue } : {}),
    ...(task.archivedAt !== undefined ? { archivedAt: task.archivedAt } : {}),
  };
  const isOverdue = !isDeleted && isTaskOverdue(taskForPresentation, now);
  const progress = readTaskProgress(task.progress);
  const dueLabel = task.dueAt
    ? formatTaskDueAt(task.dueAt, locale, timeZone).replace(/^Due /, "")
    : null;
  const labels = task.labels ?? [];
  const hasConflict = Boolean(conflictError);
  const isTerminal = task.status === "DONE" || task.status === "CANCELLED";
  const hasValidAction = isArchived
    ? Boolean(actions.onRestore || actions.onDelete)
    : Boolean(
        (actions.onStartFocus && !isTerminal && task.status !== "BLOCKED") ||
        (actions.onToggleMit && !isTerminal) ||
        (actions.onMarkDone && !isTerminal) ||
        (actions.onReopen && isTerminal) ||
        actions.onEdit ||
        actions.onDuplicate ||
        actions.onArchive,
      );
  const canShowActions = !isDeleted && !hasConflict && hasValidAction;

  return (
    <Surface
      className={[
        "lifeos-task-details-header",
        isArchived && "lifeos-task-details-header--archived",
        isDeleted && "lifeos-task-details-header--deleted",
        hasConflict && "lifeos-task-details-header--conflict",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PageHeader
        title={task.title}
        {...(task.description ? { description: task.description } : {})}
        breadcrumbs={breadcrumbs}
        metadata={
          <div className="lifeos-task-details-header__metadata">
            <div className="lifeos-task-details-header__badges">
              <Badge tone={TASK_STATUS_BADGE_TONE[task.status]}>
                {TASK_STATUS_LABEL[task.status]}
              </Badge>
              <Badge tone={TASK_PRIORITY_BADGE_TONE[task.priority]}>
                {TASK_PRIORITY_LABEL[task.priority]}
              </Badge>
              {task.isMit ? <Badge tone="accent">MIT — Most Important Task</Badge> : null}
              {isArchived ? <Badge tone="warning">Archived</Badge> : null}
              {isDeleted ? <Badge tone="danger">Deleted</Badge> : null}
              {isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
              {task.status === "BLOCKED" && (task.blockerCount ?? 0) > 0 ? (
                <Badge tone="warning">
                  {task.blockerCount} {task.blockerCount === 1 ? "blocker" : "blockers"}
                </Badge>
              ) : null}
            </div>

            <dl className="lifeos-task-details-header__facts">
              <div className="lifeos-task-details-header__fact">
                <dt>Project</dt>
                <dd>
                  {task.project ? (
                    <Link
                      href={task.project.href ?? `/life-os/app/projects/${task.project.id}`}
                      quiet
                    >
                      {task.project.name}
                    </Link>
                  ) : (
                    "No project"
                  )}
                </dd>
              </div>
              <div className="lifeos-task-details-header__fact">
                <dt>Due date</dt>
                <dd>
                  {task.dueAt && dueLabel ? (
                    <time dateTime={task.dueAt}>{dueLabel}</time>
                  ) : (
                    "No due date"
                  )}
                </dd>
              </div>
              <div className="lifeos-task-details-header__fact">
                <dt>Estimate</dt>
                <dd>
                  {task.estimateMinutes == null
                    ? "Not set"
                    : formatDurationMinutes(task.estimateMinutes, locale)}
                </dd>
              </div>
              <div className="lifeos-task-details-header__fact">
                <dt>Time spent</dt>
                <dd>
                  {task.spentMinutes == null
                    ? "Not recorded"
                    : formatDurationMinutes(task.spentMinutes, locale)}
                </dd>
              </div>
            </dl>

            <div className="lifeos-task-details-header__progress">
              <ProgressBar
                label={`${task.title} progress`}
                value={progress}
                valueText={`${progress}% complete`}
                showValue
              />
            </div>

            <div className="lifeos-task-details-header__labels" aria-label="Labels">
              <span className="lifeos-task-details-header__labels-title">Labels</span>
              {labels.length > 0 ? (
                <ul className="lifeos-task-details-header__label-list">
                  {labels.map((label) => (
                    <li key={label.id}>
                      <Badge tone="neutral">{label.name}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="lifeos-task-details-header__empty-value">No labels</span>
              )}
            </div>
          </div>
        }
        {...(canShowActions
          ? {
              primaryAction: <TaskActions task={taskForPresentation} {...actions} />,
            }
          : {})}
      />

      {isDeleted ? (
        <Alert tone="warning" heading="This task was deleted">
          <p>This Task is no longer available. Return to Tasks to continue.</p>
        </Alert>
      ) : null}

      {hasConflict ? (
        <Alert
          tone="warning"
          heading="This Task changed elsewhere"
          action={
            onLoadLatest ? (
              <Button variant="secondary" onClick={onLoadLatest}>
                Load latest
              </Button>
            ) : undefined
          }
        >
          <p>{conflictError || DEFAULT_CONFLICT_MESSAGE}</p>
        </Alert>
      ) : null}
    </Surface>
  );
}

function TaskDetailsHeaderSkeleton({ className }: { readonly className?: string }) {
  return (
    <Surface
      className={["lifeos-task-details-header", "lifeos-task-details-header--loading", className]
        .filter(Boolean)
        .join(" ")}
    >
      <VisuallyHidden>Loading task details header.</VisuallyHidden>
      <Skeleton width="10rem" height="1.25rem" />
      <div className="lifeos-task-details-header__loading-row">
        <div className="lifeos-task-details-header__loading-title">
          <Skeleton width="min(28rem, 80%)" height="2rem" />
          <Skeleton width="min(36rem, 100%)" height="1rem" />
        </div>
        <Skeleton shape="circle" width="2.5rem" height="2.5rem" />
      </div>
      <div className="lifeos-task-details-header__loading-badges">
        <Skeleton width="5rem" height="1.5rem" />
        <Skeleton width="7rem" height="1.5rem" />
        <Skeleton width="8rem" height="1.5rem" />
      </div>
      <div className="lifeos-task-details-header__loading-facts">
        <Skeleton width="9rem" height="1rem" />
        <Skeleton width="12rem" height="1rem" />
        <Skeleton width="8rem" height="1rem" />
        <Skeleton width="10rem" height="1rem" />
      </div>
      <Skeleton width="100%" height="0.5rem" />
    </Surface>
  );
}
