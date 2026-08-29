import { Badge, Button, Heading, SkeletonCard, Text } from "@components/ui";
import { ErrorState } from "@components/feedback";
import { formatLocalDate } from "@lib/localDateTime";
import {
  type Goal,
  type GoalStatus,
  calculateGoalProgressPercentage,
  formatGoalProgressValue,
  getGoalProgressExplanation,
} from "../model/goal";
import "./goal-card.css";

export interface GoalCardProps {
  readonly goal?: Goal;
  readonly linkedWorkCount?: number;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly onCheckIn?: (goal: Goal) => void;
  readonly onPause?: (goal: Goal) => void;
  readonly onResume?: (goal: Goal) => void;
  readonly onComplete?: (goal: Goal) => void;
  readonly onEdit?: (goal: Goal) => void;
  readonly onArchive?: (goal: Goal) => void;
  readonly onClick?: (goal: Goal) => void;
  readonly className?: string;
  readonly headingLevel?: 2 | 3;
}

function getStatusBadgeTone(status: GoalStatus) {
  switch (status) {
    case "NOT_STARTED":
      return "neutral";
    case "IN_PROGRESS":
      return "primary";
    case "PAUSED":
      return "warning";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "ARCHIVED":
      return "neutral";
  }
}

function getStatusLabel(status: GoalStatus) {
  switch (status) {
    case "NOT_STARTED":
      return "Not Started";
    case "IN_PROGRESS":
      return "In Progress";
    case "PAUSED":
      return "Paused";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "ARCHIVED":
      return "Archived";
  }
}

export function GoalCard({
  goal,
  linkedWorkCount = 0,
  loading = false,
  error,
  onRetry,
  onCheckIn,
  onPause,
  onResume,
  onComplete,
  onEdit,
  onArchive,
  onClick,
  className,
  headingLevel = 3,
}: GoalCardProps) {
  if (loading) {
    return <SkeletonCard {...(className ? { className } : {})} />;
  }

  if (error) {
    return (
      <ErrorState
        scope="region"
        title="Unable to load goal"
        description={error}
        {...(onRetry ? { onRetry } : {})}
        {...(className ? { className } : {})}
      />
    );
  }

  if (!goal) {
    return null;
  }

  const progressPercentage = calculateGoalProgressPercentage(goal);
  const formattedProgress = formatGoalProgressValue(goal);
  const explanation = getGoalProgressExplanation(goal, linkedWorkCount);
  const statusTone = getStatusBadgeTone(goal.status);
  const statusLabel = getStatusLabel(goal.status);

  return (
    <article
      aria-label={`Goal: ${goal.title}`}
      className={["goal-card", `goal-card--${goal.status.toLowerCase()}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="goal-card__header">
        <div className="goal-card__title-row">
          {onClick ? (
            <button type="button" className="goal-card__title-button" onClick={() => onClick(goal)}>
              <Heading level={headingLevel} size="md" className="goal-card__title">
                {goal.title}
              </Heading>
            </button>
          ) : (
            <Heading level={headingLevel} size="md" className="goal-card__title">
              {goal.title}
            </Heading>
          )}
          <div className="goal-card__badges">
            <Badge tone="info" className="goal-card__category">
              {goal.category}
            </Badge>
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </div>
        </div>
        {goal.description ? (
          <Text size="sm" tone="muted" className="goal-card__description">
            {goal.description}
          </Text>
        ) : null}
      </header>

      <div className="goal-card__progress">
        <div className="goal-card__progress-header">
          <Text size="xs" weight="medium" tone="muted">
            Progress ({formattedProgress})
          </Text>
          <Text size="xs" weight="bold">
            {progressPercentage}%
          </Text>
        </div>
        <div
          className="goal-card__progress-bar-bg"
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress for ${goal.title}`}
        >
          <div
            className="goal-card__progress-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <Text size="xs" tone="muted" className="goal-card__explanation">
          {explanation}
        </Text>
      </div>

      <div className="goal-card__meta">
        <div className="goal-card__meta-item">
          <Text size="xs" tone="muted">
            Cadence:
          </Text>
          <Badge tone="neutral">{goal.checkInCadence}</Badge>
        </div>

        {goal.targetDate ? (
          <div className="goal-card__meta-item">
            <Text size="xs" tone="muted">
              Target Date:
            </Text>
            <Text size="xs" weight="medium">
              {formatLocalDate(goal.targetDate as `${number}-${string}-${string}`, "en-US")}
            </Text>
          </div>
        ) : null}

        {linkedWorkCount > 0 ? (
          <div className="goal-card__meta-item">
            <Text size="xs" tone="muted">
              Linked Work:
            </Text>
            <Badge tone="info">
              {linkedWorkCount} item{linkedWorkCount > 1 ? "s" : ""}
            </Badge>
          </div>
        ) : null}
      </div>

      <footer className="goal-card__actions">
        {goal.status !== "COMPLETED" && goal.status !== "ARCHIVED" && onCheckIn ? (
          <Button variant="primary" size="sm" onClick={() => onCheckIn(goal)}>
            Check In
          </Button>
        ) : null}

        {goal.status === "IN_PROGRESS" && onPause ? (
          <Button variant="secondary" size="sm" onClick={() => onPause(goal)}>
            Pause
          </Button>
        ) : null}

        {goal.status === "PAUSED" && onResume ? (
          <Button variant="secondary" size="sm" onClick={() => onResume(goal)}>
            Resume
          </Button>
        ) : null}

        {goal.status !== "COMPLETED" && goal.status !== "ARCHIVED" && onComplete ? (
          <Button variant="secondary" size="sm" onClick={() => onComplete(goal)}>
            Mark Complete
          </Button>
        ) : null}

        {onEdit ? (
          <Button variant="ghost" size="sm" onClick={() => onEdit(goal)}>
            Edit
          </Button>
        ) : null}

        {goal.status !== "ARCHIVED" && onArchive ? (
          <Button variant="ghost" size="sm" onClick={() => onArchive(goal)}>
            Archive
          </Button>
        ) : null}
      </footer>
    </article>
  );
}
