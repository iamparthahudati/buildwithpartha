import { Target, CheckCircle2, Flame, Edit2 } from "lucide-react";
import { Badge, Button, Icon, Skeleton, Surface, Text, VisuallyHidden } from "@components/ui";
import { EmptyState, ErrorState } from "@components/feedback";
import { formatDurationMinutes } from "@lib/duration";
import "./time-goal-progress-card.css";

export type TimeGoalProgressStatus = "ready" | "loading" | "empty" | "error";

export interface TimeGoalProgressCardProps {
  readonly status: TimeGoalProgressStatus;
  readonly targetMinutes?: number;
  readonly actualMinutes?: number;
  readonly title?: string;
  readonly locale?: string;
  readonly onRetry?: () => void;
  readonly onEditGoal?: () => void;
  readonly className?: string;
}

export function TimeGoalProgressCard({
  status,
  targetMinutes = 0,
  actualMinutes = 0,
  title = "Daily focus goal",
  locale = "en-US",
  onRetry,
  onEditGoal,
  className = "",
}: TimeGoalProgressCardProps) {
  if (status === "loading") {
    return (
      <Surface className={`time-goal-progress-card ${className}`.trim()} aria-label={title}>
        <div className="time-goal-progress-card__header">
          <Skeleton width="120px" height="20px" />
        </div>
        <div className="time-goal-progress-card__body">
          <Skeleton shape="circle" width="80px" height="80px" />
          <div className="time-goal-progress-card__info">
            <Skeleton width="140px" height="24px" />
            <Skeleton width="100px" height="16px" />
          </div>
        </div>
      </Surface>
    );
  }

  if (status === "error") {
    return (
      <Surface className={`time-goal-progress-card ${className}`.trim()}>
        <ErrorState
          title="Unable to load goal progress"
          description="There was a problem retrieving your focus goal."
          {...(onRetry ? { onRetry } : {})}
          scope="region"
        />
      </Surface>
    );
  }

  if (status === "empty" || targetMinutes <= 0) {
    return (
      <Surface className={`time-goal-progress-card ${className}`.trim()}>
        <EmptyState
          variant="first-use"
          icon={Target}
          title="No focus goal set"
          description="Set a daily target to track your focus time commitment."
          primaryAction={
            onEditGoal ? (
              <Button variant="secondary" size="sm" onClick={onEditGoal}>
                Set focus goal
              </Button>
            ) : undefined
          }
        />
      </Surface>
    );
  }

  const percentage = Math.min(100, Math.max(0, Math.round((actualMinutes / targetMinutes) * 100)));
  const isGoalReached = actualMinutes >= targetMinutes;
  const remainingMinutes = Math.max(0, targetMinutes - actualMinutes);

  const formattedActual = formatDurationMinutes(actualMinutes, locale);
  const formattedTarget = formatDurationMinutes(targetMinutes, locale);
  const formattedRemaining = formatDurationMinutes(remainingMinutes, locale);

  const statusText = isGoalReached
    ? "Goal reached!"
    : `${formattedRemaining} remaining to reach daily goal`;

  const strokeDasharray = 220; // 2 * pi * r (r=35)
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <Surface
      as="section"
      className={`time-goal-progress-card ${className}`.trim()}
      aria-label={title}
    >
      <div className="time-goal-progress-card__header">
        <div className="time-goal-progress-card__title-group">
          <Icon icon={Target} decorative size="md" className="time-goal-progress-card__icon" />
          <Text size="md" weight="medium">
            {title}
          </Text>
        </div>
        {onEditGoal && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditGoal}
            aria-label="Edit focus goal target"
          >
            <Icon icon={Edit2} decorative size="sm" />
            <VisuallyHidden>Edit goal</VisuallyHidden>
          </Button>
        )}
      </div>

      <div className="time-goal-progress-card__body">
        <div className="time-goal-progress-card__ring-wrapper">
          <svg className="time-goal-progress-card__ring" viewBox="0 0 80 80" aria-hidden="true">
            <circle className="time-goal-progress-card__ring-track" cx="40" cy="40" r="35" />
            <circle
              className="time-goal-progress-card__ring-progress"
              cx="40"
              cy="40"
              r="35"
              style={{
                strokeDasharray,
                strokeDashoffset,
              }}
            />
          </svg>
          <span className="time-goal-progress-card__percentage">{percentage}%</span>
        </div>

        <div className="time-goal-progress-card__info">
          <div className="time-goal-progress-card__values">
            <Text size="lg" weight="bold" className="time-goal-progress-card__actual">
              {formattedActual}
            </Text>
            <Text size="sm" tone="muted">
              of {formattedTarget} target
            </Text>
          </div>

          <div className="time-goal-progress-card__badge-row">
            <Badge
              tone={isGoalReached ? "success" : "accent"}
              icon={isGoalReached ? CheckCircle2 : Flame}
            >
              {statusText}
            </Badge>
          </div>
        </div>
      </div>
    </Surface>
  );
}
