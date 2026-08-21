import { EmptyState, ErrorState } from "@components/feedback";
import { Badge, ProgressBar, Skeleton } from "@components/ui";

import type { Sprint } from "../model/sprint";
import "./sprint-progress-capacity.css";

export interface SprintProgressCapacityProps {
  readonly sprint?: Sprint | null;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function SprintProgressCapacity({
  sprint,
  loading = false,
  error,
  onRetry,
  className,
}: SprintProgressCapacityProps) {
  if (loading) {
    return (
      <div
        className={["sprint-progress-capacity", "is-loading", className].filter(Boolean).join(" ")}
      >
        <Skeleton height="24px" width="40%" />
        <Skeleton height="40px" width="100%" />
        <Skeleton height="40px" width="100%" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        scope="region"
        title="Unable to load sprint progress"
        description={error}
        {...(onRetry ? { onRetry } : {})}
        {...(className ? { className } : {})}
      />
    );
  }

  if (!sprint) {
    return (
      <EmptyState
        variant="first-use"
        title="No sprint data"
        description="Select or create a sprint to view capacity and progress."
        {...(className ? { className } : {})}
      />
    );
  }

  const { completedStoryPoints, totalStoryPoints, targetCapacityPoints } = sprint;
  const hasPoints = totalStoryPoints > 0;
  const percentComplete = hasPoints
    ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
    : 0;
  const capacityPercent =
    targetCapacityPoints > 0 ? Math.round((totalStoryPoints / targetCapacityPoints) * 100) : 0;
  const isOverCapacity = targetCapacityPoints > 0 && totalStoryPoints > targetCapacityPoints;

  return (
    <div
      role="region"
      aria-label="Sprint progress and capacity"
      className={["sprint-progress-capacity", className].filter(Boolean).join(" ")}
    >
      <div className="sprint-progress-capacity__row">
        <div className="sprint-progress-capacity__metric">
          <span className="sprint-progress-capacity__label">Story Points Completed</span>
          <span className="sprint-progress-capacity__value">
            {completedStoryPoints} / {totalStoryPoints} pts (
            {hasPoints ? `${percentComplete}%` : "No points"})
          </span>
        </div>

        <div className="sprint-progress-capacity__metric">
          <span className="sprint-progress-capacity__label">Planned vs Capacity</span>
          <div className="sprint-progress-capacity__capacity-badge-row">
            <span className="sprint-progress-capacity__value">
              {totalStoryPoints} / {targetCapacityPoints} pts ({capacityPercent}%)
            </span>
            {isOverCapacity ? (
              <Badge tone="danger">Over capacity</Badge>
            ) : (
              <Badge tone="success">Within capacity</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="sprint-progress-capacity__bars">
        <ProgressBar
          label="Sprint Story Point Completion"
          value={completedStoryPoints}
          max={totalStoryPoints > 0 ? totalStoryPoints : 100}
          showValue
          valueText={`${completedStoryPoints} of ${totalStoryPoints} pts done`}
          tone={percentComplete === 100 ? "success" : "primary"}
        />

        <ProgressBar
          label="Sprint Capacity Utilization"
          value={totalStoryPoints}
          max={targetCapacityPoints > 0 ? targetCapacityPoints : 100}
          showValue
          valueText={`${totalStoryPoints} of ${targetCapacityPoints} pts capacity planned`}
          tone={isOverCapacity ? "danger" : "primary"}
        />
      </div>
    </div>
  );
}
