import { ErrorState } from "@components/feedback";

export interface GoalErrorStateProps {
  readonly message?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function GoalErrorState({ message, onRetry, className }: GoalErrorStateProps) {
  return (
    <ErrorState
      scope="page"
      title="Unable to load goals"
      description={
        message || "Something went wrong while retrieving goal records. Please try again."
      }
      {...(onRetry ? { onRetry } : {})}
      {...(className ? { className } : {})}
    />
  );
}
