import { Badge, Heading, SkeletonTable, Text } from "@components/ui";
import { EmptyState, ErrorState } from "@components/feedback";
import type { ScopeChangeType, SprintScopeChangeEvent } from "../model/sprint";
import "./sprint-scope-change-history.css";

export interface SprintScopeChangeHistoryProps {
  readonly events?: readonly SprintScopeChangeEvent[];
  readonly loading?: boolean;
  readonly error?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
  readonly locale?: string;
  readonly timeZone?: string;
}

function getChangeTypeBadgeTone(type: ScopeChangeType) {
  switch (type) {
    case "TASK_ADDED":
      return "warning";
    case "TASK_REMOVED":
      return "danger";
    case "POINTS_CHANGED":
      return "info";
    case "CAPACITY_CHANGED":
      return "neutral";
  }
}

function getChangeTypeLabel(type: ScopeChangeType) {
  switch (type) {
    case "TASK_ADDED":
      return "+ Task Added";
    case "TASK_REMOVED":
      return "- Task Removed";
    case "POINTS_CHANGED":
      return "Points Changed";
    case "CAPACITY_CHANGED":
      return "Capacity Changed";
  }
}

export function SprintScopeChangeHistory({
  events = [],
  loading = false,
  error,
  onRetry,
  className,
  locale = "en-US",
  timeZone = "UTC",
}: SprintScopeChangeHistoryProps) {
  if (loading) {
    return <SkeletonTable rows={3} {...(className ? { className } : {})} />;
  }

  if (error) {
    return (
      <ErrorState
        scope="region"
        title="Unable to load scope change history"
        description={error}
        {...(onRetry ? { onRetry } : {})}
        {...(className ? { className } : {})}
      />
    );
  }

  return (
    <div
      role="region"
      aria-label="Sprint scope change history"
      className={["sprint-scope-change-history", className].filter(Boolean).join(" ")}
    >
      <div className="sprint-scope-change-history__header">
        <Heading level={3} size="sm" className="sprint-scope-change-history__title">
          Scope Change History ({events.length})
        </Heading>
      </div>

      {events.length === 0 ? (
        <EmptyState
          variant="first-use"
          title="No scope changes"
          description="Scope changes made after sprint start will be recorded here."
        />
      ) : (
        <ul className="sprint-scope-change-history__items">
          {events.map((event) => (
            <li key={event.id} className="sprint-scope-change-history__item">
              <div className="sprint-scope-change-history__item-header">
                <div className="sprint-scope-change-history__badge-row">
                  <Badge tone={getChangeTypeBadgeTone(event.changeType)}>
                    {getChangeTypeLabel(event.changeType)}
                  </Badge>
                  {event.taskTitle ? (
                    <span className="sprint-scope-change-history__task-title">
                      {event.taskTitle}
                    </span>
                  ) : null}
                </div>
                <Text size="xs" tone="muted" className="sprint-scope-change-history__timestamp">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone,
                  }).format(new Date(event.timestamp))}
                </Text>
              </div>

              {event.reason || event.pointsDelta !== undefined ? (
                <div className="sprint-scope-change-history__item-details">
                  {event.pointsDelta !== undefined ? (
                    <Text
                      size="xs"
                      weight="medium"
                      tone={event.pointsDelta > 0 ? "danger" : "muted"}
                    >
                      Impact: {event.pointsDelta > 0 ? `+${event.pointsDelta}` : event.pointsDelta}{" "}
                      pts
                    </Text>
                  ) : null}
                  {event.reason ? (
                    <Text size="xs" tone="muted" className="sprint-scope-change-history__reason">
                      Note: {event.reason}
                    </Text>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
