import { Button } from "@components/ui";
import { EmptyState } from "@components/feedback";

export interface GoalEmptyStateProps {
  readonly onCreateGoal?: () => void;
  readonly className?: string;
}

export function GoalEmptyState({ onCreateGoal, className }: GoalEmptyStateProps) {
  return (
    <EmptyState
      variant="first-use"
      title="No goals set yet"
      description="Connect your vision to projects, tasks, and habits. Start with a percentage, numeric, milestone, or binary target."
      {...(onCreateGoal
        ? {
            primaryAction: (
              <Button variant="primary" onClick={onCreateGoal}>
                Create Your First Goal
              </Button>
            ),
          }
        : {})}
      {...(className ? { className } : {})}
    />
  );
}
