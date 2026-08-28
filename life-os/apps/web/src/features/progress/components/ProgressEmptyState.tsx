import { EmptyState, type EmptyStateVariant } from "@components/feedback";
import "./progress-empty-state.css";

export interface ProgressEmptyStateProps {
  readonly variant?: EmptyStateVariant;
  readonly title?: string;
  readonly description?: string;
  readonly className?: string;
}

export function ProgressEmptyState({
  variant = "filtered",
  title = "No progress data for selected period",
  description = "No completed tasks, focus sessions, or goal check-ins were recorded within this date range. Select a different period or record activity to view insights.",
  className,
}: ProgressEmptyStateProps) {
  return (
    <EmptyState
      variant={variant}
      title={title}
      description={description}
      titleLevel={3}
      className={["progress-empty-state", className].filter(Boolean).join(" ")}
    />
  );
}
