import { ErrorState } from "@components/feedback";

export interface ProgressErrorStateProps {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function ProgressErrorState({
  title = "Unable to load progress data",
  description = "A network or server error occurred while retrieving progress analytics. Please check your connection and try again.",
  onRetry,
  className,
}: ProgressErrorStateProps) {
  return (
    <ErrorState
      scope="region"
      title={title}
      description={description}
      {...(onRetry ? { onRetry } : {})}
      {...(className ? { className } : {})}
    />
  );
}
