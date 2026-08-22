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
import "./task-row.css";

export interface TaskRowProps extends TaskActionCallbacks {
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

export function TaskRow({
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
}: TaskRowProps) {
  const rootClass = ["lifeos-task-row", className].filter(Boolean).join(" ");

  if (loading || !task) {
    return (
      <Surface bordered padding="sm" className={[rootClass, "lifeos-task-row--loading"].join(" ")}>
        <VisuallyHidden>Loading task.</VisuallyHidden>
        <div className="lifeos-task-row__selection">
          <Skeleton shape="circle" width="1.25rem" height="1.25rem" />
        </div>
        <div className="lifeos-task-row__loading-identity">
          <Skeleton width="100%" height="1rem" />
          <Skeleton width="65%" height="0.75rem" />
        </div>
        <div className="lifeos-task-row__state">
          <Skeleton width="100%" height="1.25rem" />
        </div>
        <div className="lifeos-task-row__meta">
          <Skeleton width="75%" height="0.75rem" />
        </div>
        <div className="lifeos-task-row__actions">
          <Skeleton shape="circle" width="2rem" height="2rem" />
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
      padding="sm"
      className={[
        rootClass,
        selected && "lifeos-task-row--selected",
        isArchived && "lifeos-task-row--archived",
        isOverdue && "lifeos-task-row--overdue",
        isBlocked && "lifeos-task-row--blocked",
        isDone && "lifeos-task-row--done",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="lifeos-task-row__selection">
        {onSelectedChange ? (
          <Checkbox
            label={`Select ${task.title}`}
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
          />
        ) : null}
      </div>

      <div className="lifeos-task-row__identity">
        <div className="lifeos-task-row__title-line">
          <Link href={taskHref} aria-label={`Open task: ${task.title}`}>
            {task.title}
          </Link>
          {task.isMit ? (
            <Badge tone="accent">
              MIT<VisuallyHidden> — Most Important Task</VisuallyHidden>
            </Badge>
          ) : null}
          {isArchived ? <Badge tone="neutral">Archived</Badge> : null}
          {isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
        </div>
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

      <div className="lifeos-task-row__state">
        <div className="lifeos-task-row__badges">
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
          labelHidden
          value={progress}
          valueText={`${progress}% complete`}
          size="sm"
        />
      </div>

      <div className="lifeos-task-row__meta">
        <Text size="xs" tone={isOverdue ? "danger" : "secondary"}>
          {task.dueAt ? (
            <time dateTime={task.dueAt}>{formatTaskDueAt(task.dueAt, locale, timeZone)}</time>
          ) : (
            "No due date"
          )}
        </Text>
        <span className="lifeos-task-row__comments" aria-label={commentLabel}>
          <Icon icon={MessageSquare} decorative size="sm" />
          <Text inline size="xs" tone="secondary">
            {task.commentCount}
          </Text>
        </span>
      </div>

      <div className="lifeos-task-row__actions">
        <TaskActions task={task} {...actions} />
      </div>
    </Surface>
  );
}
