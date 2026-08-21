import { MessageSquare } from "lucide-react";

import {
  Badge,
  Checkbox,
  Icon,
  Link,
  ProgressBar,
  Skeleton,
  Surface,
  Text,
  VisuallyHidden,
} from "@components/ui";

import type { TaskListItem } from "../model/task";
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
import "./task-card.css";

export interface TaskCardProps extends TaskActionCallbacks {
  readonly task?: TaskListItem;
  readonly loading?: boolean;
  readonly selected?: boolean;
  readonly onSelectedChange?: (selected: boolean) => void;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly now?: Date;
  readonly href?: string;
  readonly className?: string;
}

export function TaskCard({
  task,
  loading = false,
  selected = false,
  onSelectedChange,
  locale = "en-US",
  timeZone = "UTC",
  now = new Date(),
  href,
  className,
  ...actions
}: TaskCardProps) {
  const rootClass = ["lifeos-task-card", className].filter(Boolean).join(" ");

  if (loading || !task) {
    return (
      <Surface bordered padding="md" className={[rootClass, "lifeos-task-card--loading"].join(" ")}>
        <VisuallyHidden>Loading task card.</VisuallyHidden>
        <div className="lifeos-task-card__header">
          <Skeleton shape="circle" width="1.25rem" height="1.25rem" />
          <Skeleton shape="circle" width="2rem" height="2rem" />
        </div>
        <Skeleton width="80%" height="1.25rem" />
        <Skeleton width="45%" height="0.875rem" />
        <Skeleton width="100%" height="0.5rem" />
        <div className="lifeos-task-card__footer">
          <Skeleton width="55%" height="0.75rem" />
          <Skeleton width="2rem" height="0.75rem" />
        </div>
      </Surface>
    );
  }

  const isArchived = Boolean(task.archivedAt);
  const isOverdue = isTaskOverdue(task, now);
  const isDone = task.status === "DONE";
  const isBlocked = task.status === "BLOCKED";
  const taskHref = href ?? task.href ?? `/life-os/app/tasks/${task.id}`;
  const progress = readTaskProgress(task.progress);
  const commentLabel = `${task.commentCount} ${task.commentCount === 1 ? "comment" : "comments"}`;

  return (
    <Surface
      bordered
      interactive
      padding="md"
      className={[
        rootClass,
        selected && "lifeos-task-card--selected",
        isArchived && "lifeos-task-card--archived",
        isOverdue && "lifeos-task-card--overdue",
        isBlocked && "lifeos-task-card--blocked",
        isDone && "lifeos-task-card--done",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="lifeos-task-card__header">
        {onSelectedChange ? (
          <div className="lifeos-task-card__selection">
            <Checkbox
              label={`Select ${task.title}`}
              checked={selected}
              onChange={(event) => onSelectedChange(event.target.checked)}
            />
          </div>
        ) : (
          <span />
        )}
        <TaskActions task={task} {...actions} />
      </div>

      <div className="lifeos-task-card__identity">
        <Link href={taskHref} aria-label={`Open task: ${task.title}`}>
          {task.title}
        </Link>
        {task.project ? (
          <Link href={task.project.href ?? `/life-os/app/projects/${task.project.id}`} quiet>
            {task.project.name}
          </Link>
        ) : (
          <Text size="xs" tone="muted">
            No project
          </Text>
        )}
      </div>

      <div className="lifeos-task-card__badges">
        {task.isMit ? (
          <Badge tone="accent">
            MIT<VisuallyHidden> — Most Important Task</VisuallyHidden>
          </Badge>
        ) : null}
        {isArchived ? <Badge tone="neutral">Archived</Badge> : null}
        {isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
        <Badge tone={TASK_STATUS_BADGE_TONE[task.status]}>{TASK_STATUS_LABEL[task.status]}</Badge>
        <Badge tone={TASK_PRIORITY_BADGE_TONE[task.priority]}>
          {TASK_PRIORITY_LABEL[task.priority]}
        </Badge>
        {isBlocked && task.blockerCount ? (
          <Badge tone="warning">
            {task.blockerCount} {task.blockerCount === 1 ? "blocker" : "blockers"}
          </Badge>
        ) : null}
      </div>

      <ProgressBar
        label={`${task.title} progress`}
        value={progress}
        valueText={`${progress}% complete`}
        showValue
        size="sm"
      />

      <div className="lifeos-task-card__footer">
        <Text size="xs" tone={isOverdue ? "danger" : "secondary"}>
          {task.dueAt ? (
            <time dateTime={task.dueAt}>{formatTaskDueAt(task.dueAt, locale, timeZone)}</time>
          ) : (
            "No due date"
          )}
        </Text>
        <span className="lifeos-task-card__comments" aria-label={commentLabel}>
          <Icon icon={MessageSquare} decorative size="sm" />
          <Text inline size="xs" tone="secondary">
            {task.commentCount}
          </Text>
        </span>
      </div>
    </Surface>
  );
}
