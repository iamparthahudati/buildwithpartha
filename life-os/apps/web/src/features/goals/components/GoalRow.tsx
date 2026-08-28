import { Badge, Button, Text } from "@components/ui";
import {
  type Goal,
  type GoalStatus,
  calculateGoalProgressPercentage,
  formatGoalProgressValue,
} from "../model/goal";
import "./goal-row.css";

export interface GoalRowProps {
  readonly goal: Goal;
  readonly onCheckIn?: (goal: Goal) => void;
  readonly onSelect?: (goal: Goal) => void;
  readonly onClick?: (goal: Goal) => void;
  readonly onPause?: (goal: Goal) => void;
  readonly onResume?: (goal: Goal) => void;
  readonly onComplete?: (goal: Goal) => void;
  readonly onEdit?: (goal: Goal) => void;
  readonly onArchive?: (goal: Goal) => void;
  readonly className?: string;
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

export function GoalRow({
  goal,
  onCheckIn,
  onSelect,
  onClick,
  onPause,
  onResume,
  onComplete,
  onEdit,
  onArchive,
  className,
}: GoalRowProps) {
  const progressPercentage = calculateGoalProgressPercentage(goal);
  const formattedValue = formatGoalProgressValue(goal);
  const statusTone = getStatusBadgeTone(goal.status);
  const selectHandler = onClick ?? onSelect;

  return (
    <div
      aria-label={`Goal row: ${goal.title}`}
      className={["goal-row", `goal-row--${goal.status.toLowerCase()}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="goal-row__main"
        onClick={() => selectHandler?.(goal)}
        tabIndex={selectHandler ? 0 : undefined}
        role={selectHandler ? "button" : undefined}
        aria-label={selectHandler ? `Select ${goal.title}` : undefined}
        onKeyDown={(e) => {
          if (selectHandler && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            selectHandler(goal);
          }
        }}
      >
        <Text weight="medium" size="sm" className="goal-row__title">
          {goal.title}
        </Text>
        <Badge tone="info" className="goal-row__category">
          {goal.category}
        </Badge>
      </div>

      <div className="goal-row__progress-section">
        <div
          className="goal-row__progress-bar-bg"
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress for ${goal.title}`}
        >
          <div
            className="goal-row__progress-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <Text size="xs" tone="muted" className="goal-row__progress-text">
          {progressPercentage}% ({formattedValue})
        </Text>
      </div>

      <div className="goal-row__status">
        <Badge tone={statusTone}>{goal.status.replace("_", " ")}</Badge>
      </div>

      <div className="goal-row__actions">
        {goal.status !== "COMPLETED" && goal.status !== "ARCHIVED" && onCheckIn ? (
          <Button variant="secondary" size="sm" onClick={() => onCheckIn(goal)}>
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
            Complete
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
      </div>
    </div>
  );
}
