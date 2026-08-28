import { Button } from "@components/ui";
import { InlineMessage } from "@components/feedback";
import type { PlannerMutationState } from "../model/weekPlanner";

export interface PlannerMutationStatusProps {
  readonly mutation?: PlannerMutationState;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly className?: string;
}

export function PlannerMutationStatus({
  mutation = { type: "idle" },
  onRetry,
  retryLabel = "Try again",
  className,
}: PlannerMutationStatusProps) {
  if (mutation.type === "idle") {
    return null;
  }

  if (mutation.type === "saving") {
    return (
      <InlineMessage tone="info" announce="status" {...(className ? { className } : {})}>
        Saving changes…
      </InlineMessage>
    );
  }

  if (mutation.type === "saved") {
    return (
      <InlineMessage tone="success" announce="status" {...(className ? { className } : {})}>
        Saved
      </InlineMessage>
    );
  }

  return (
    <span className={className}>
      <InlineMessage tone="danger" announce="alert">
        {mutation.message}
      </InlineMessage>
      {onRetry ? (
        <Button variant="link" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </span>
  );
}
