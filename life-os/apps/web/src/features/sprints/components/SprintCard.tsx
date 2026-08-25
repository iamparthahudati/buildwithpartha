import { Badge, Button, Heading, SkeletonCard, Text } from "@components/ui";
import { ErrorState } from "@components/feedback";
import { formatLocalDate } from "@lib/localDateTime";
import type { Sprint, SprintStatus } from "../model/sprint";
import { SprintProgressCapacity } from "./SprintProgressCapacity";
import "./sprint-card.css";

export interface SprintCardProps {
  readonly sprint?: Sprint;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly onStartSprint?: (sprint: Sprint) => void;
  readonly onCompleteSprint?: (sprint: Sprint) => void;
  readonly onEditScope?: (sprint: Sprint) => void;
  readonly onViewRetrospective?: (sprint: Sprint) => void;
  readonly onEditSprint?: (sprint: Sprint) => void;
  readonly className?: string;
  readonly headingLevel?: 2 | 3;
}

function getStatusBadgeTone(status: SprintStatus) {
  switch (status) {
    case "PLANNED":
      return "info";
    case "ACTIVE":
      return "primary";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "neutral";
  }
}

function getStatusLabel(status: SprintStatus) {
  switch (status) {
    case "PLANNED":
      return "Planned";
    case "ACTIVE":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
  }
}

export function SprintCard({
  sprint,
  loading = false,
  error,
  onRetry,
  onStartSprint,
  onCompleteSprint,
  onEditScope,
  onViewRetrospective,
  onEditSprint,
  className,
  headingLevel = 3,
}: SprintCardProps) {
  if (loading) {
    return <SkeletonCard {...(className ? { className } : {})} />;
  }

  if (error) {
    return (
      <ErrorState
        scope="region"
        title="Unable to load sprint"
        description={error}
        {...(onRetry ? { onRetry } : {})}
        {...(className ? { className } : {})}
      />
    );
  }

  if (!sprint) {
    return null;
  }

  const statusTone = getStatusBadgeTone(sprint.status);
  const statusLabel = getStatusLabel(sprint.status);
  const dateRangeText = `${formatLocalDate(sprint.startDate, "en-US")} – ${formatLocalDate(sprint.endDate, "en-US")}`;

  return (
    <article
      aria-label={`Sprint: ${sprint.name}`}
      className={["sprint-card", `sprint-card--${sprint.status.toLowerCase()}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="sprint-card__header">
        <div className="sprint-card__title-row">
          <Heading level={headingLevel} size="md" className="sprint-card__title">
            {sprint.name}
          </Heading>
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </div>
        <Text size="sm" tone="muted" className="sprint-card__dates">
          {dateRangeText}
        </Text>
      </header>

      {sprint.goal ? (
        <div className="sprint-card__goal">
          <Text size="xs" tone="muted" weight="medium" className="sprint-card__goal-label">
            Sprint Goal
          </Text>
          <Text size="sm" className="sprint-card__goal-text">
            {sprint.goal}
          </Text>
        </div>
      ) : null}

      <div className="sprint-card__progress">
        <SprintProgressCapacity sprint={sprint} />
      </div>

      <footer className="sprint-card__actions">
        {sprint.status === "PLANNED" && onStartSprint ? (
          <Button variant="primary" size="sm" onClick={() => onStartSprint(sprint)}>
            Start Sprint
          </Button>
        ) : null}

        {sprint.status === "ACTIVE" && onCompleteSprint ? (
          <Button variant="primary" size="sm" onClick={() => onCompleteSprint(sprint)}>
            Complete & Retrospective
          </Button>
        ) : null}

        {(sprint.status === "PLANNED" || sprint.status === "ACTIVE") && onEditScope ? (
          <Button variant="secondary" size="sm" onClick={() => onEditScope(sprint)}>
            {sprint.status === "PLANNED" ? "Plan Scope" : "Edit Scope"}
          </Button>
        ) : null}

        {sprint.status === "COMPLETED" && onViewRetrospective ? (
          <Button variant="secondary" size="sm" onClick={() => onViewRetrospective(sprint)}>
            View Retrospective
          </Button>
        ) : null}

        {(sprint.status === "PLANNED" || sprint.status === "ACTIVE") && onEditSprint ? (
          <Button variant="ghost" size="sm" onClick={() => onEditSprint(sprint)}>
            Edit Details
          </Button>
        ) : null}
      </footer>
    </article>
  );
}
