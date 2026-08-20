import { Badge, Button, Heading, SkeletonTable, Text } from "@components/ui";
import { EmptyState, ErrorState } from "@components/feedback";
import type { SprintTask, TaskStatus } from "../model/sprint";
import "./sprint-task-commitment-list.css";

export interface SprintTaskCommitmentListProps {
  readonly tasks?: readonly SprintTask[];
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly onToggleTaskStatus?: (taskId: string, currentStatus: TaskStatus) => void;
  readonly onRemoveTask?: (taskId: string) => void;
  readonly onAddTask?: () => void;
  readonly isEditable?: boolean;
  readonly className?: string;
}

function getTaskStatusBadgeTone(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return "neutral";
    case "IN_PROGRESS":
      return "info";
    case "DONE":
      return "success";
    case "CANCELLED":
      return "neutral";
  }
}

export function SprintTaskCommitmentList({
  tasks = [],
  loading = false,
  error,
  onRetry,
  onToggleTaskStatus,
  onRemoveTask,
  onAddTask,
  isEditable = true,
  className,
}: SprintTaskCommitmentListProps) {
  if (loading) {
    return <SkeletonTable rows={4} className={className} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load sprint tasks"
        description={error}
        {...(onRetry ? { onRetry } : {})}
        className={className}
      />
    );
  }

  const totalPoints = tasks.reduce((sum, t) => sum + t.storyPoints, 0);
  const completedPoints = tasks
    .filter((t) => t.status === "DONE")
    .reduce((sum, t) => sum + t.storyPoints, 0);

  return (
    <div
      role="region"
      aria-label="Sprint task commitment list"
      className={["sprint-task-commitment-list", className].filter(Boolean).join(" ")}
    >
      <div className="sprint-task-commitment-list__header">
        <div>
          <Heading level={4} size="sm" className="sprint-task-commitment-list__title">
            Task Commitments ({tasks.length})
          </Heading>
          <Text size="xs" tone="muted">
            {completedPoints} of {totalPoints} story points completed
          </Text>
        </div>

        {isEditable && onAddTask ? (
          <Button variant="secondary" size="sm" onClick={onAddTask}>
            + Add Task
          </Button>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks committed"
          description="No tasks are currently assigned to this sprint."
          {...(isEditable && onAddTask
            ? { actionLabel: "Add Task to Sprint", onAction: onAddTask }
            : {})}
        />
      ) : (
        <ul className="sprint-task-commitment-list__items">
          {tasks.map((task) => (
            <li key={task.id} className="sprint-task-commitment-list__item">
              <div className="sprint-task-commitment-list__item-main">
                <button
                  type="button"
                  className={[
                    "sprint-task-commitment-list__status-toggle",
                    `is-${task.status.toLowerCase()}`,
                  ].join(" ")}
                  aria-label={`Mark task ${task.title} as ${task.status === "DONE" ? "todo" : "done"}`}
                  onClick={() => onToggleTaskStatus?.(task.id, task.status)}
                  disabled={!onToggleTaskStatus}
                >
                  <span className="sprint-task-commitment-list__check-icon" aria-hidden="true">
                    {task.status === "DONE" ? "✓" : ""}
                  </span>
                </button>

                <div className="sprint-task-commitment-list__item-details">
                  <span
                    className={[
                      "sprint-task-commitment-list__item-title",
                      task.status === "DONE" && "is-done",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {task.title}
                  </span>

                  <div className="sprint-task-commitment-list__meta">
                    {task.projectName ? (
                      <span className="sprint-task-commitment-list__project">
                        {task.projectName}
                      </span>
                    ) : null}
                    <Badge tone={getTaskStatusBadgeTone(task.status)}>{task.status}</Badge>
                    {task.isCommitted ? (
                      <Badge tone="neutral">Committed</Badge>
                    ) : (
                      <Badge tone="warning">Scope Addition</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="sprint-task-commitment-list__item-actions">
                <span className="sprint-task-commitment-list__points">{task.storyPoints} pts</span>
                {isEditable && onRemoveTask ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${task.title} from sprint`}
                    onClick={() => onRemoveTask(task.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
