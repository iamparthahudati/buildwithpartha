import { ArrowRight, Play } from "lucide-react";

import { EmptyState, ErrorState } from "@components/feedback";
import {
  Badge,
  Button,
  Link,
  PRIORITY_TONE,
  SkeletonCard,
  Surface,
  Text,
  VisuallyHidden,
} from "@components/ui";

import "./today-next-up.css";

export type TodayNextUpAvailability = "no-focus-selected" | "focus-completed";
export type ProductPriority = "P1" | "P2" | "P3" | "P4";

export interface TodayNextTask {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly projectName?: string;
  readonly priority: ProductPriority;
  readonly timingLabel?: string;
}

export type TodayNextUpStatus =
  | { readonly type: "hidden" }
  | { readonly type: "loading"; readonly availability: TodayNextUpAvailability }
  | { readonly type: "empty"; readonly availability: TodayNextUpAvailability }
  | {
      readonly type: "error";
      readonly availability: TodayNextUpAvailability;
      readonly message: string;
    }
  | {
      readonly type: "ready";
      readonly availability: TodayNextUpAvailability;
      readonly task: TodayNextTask;
      /** Recorded facts that put this Task first under the supplied rule. */
      readonly rankingExplanation: string;
    };

export interface TodayNextUpProps {
  readonly status: TodayNextUpStatus;
  /** Human-readable canonical source, such as "Open tasks". */
  readonly sourceLabel: string;
  /** The deterministic order used by the source query; never an AI claim. */
  readonly rankingRule: string;
  readonly tasksHref: string;
  readonly onRetry?: () => void;
  readonly onStartFocus?: (taskId: string) => void;
  readonly startFocusDisabled?: boolean;
  readonly startFocusPending?: boolean;
  readonly className?: string;
}

const PRIORITY_LABEL: Readonly<Record<ProductPriority, string>> = Object.freeze({
  P1: "P1 — High",
  P2: "P2 — Medium",
  P3: "P3 — Low",
  P4: "P4 — Someday",
});

const AVAILABILITY_COPY: Readonly<Record<TodayNextUpAvailability, string>> = Object.freeze({
  "no-focus-selected": "Shown because no focus is selected for today.",
  "focus-completed": "Shown because today's focus is complete.",
});

/**
 * Deterministically ranked next Task for Today (LOS-0612).
 *
 * The widget cannot appear while a focus Task is still active: callers express
 * that state as `hidden`. When visible, it names both the canonical source and
 * the exact ranking rule, then displays the recorded facts that put this Task
 * first. The component makes no AI or motivational claim.
 */
export function TodayNextUp({
  status,
  sourceLabel,
  rankingRule,
  tasksHref,
  onRetry,
  onStartFocus,
  startFocusDisabled = false,
  startFocusPending = false,
  className,
}: TodayNextUpProps) {
  if (status.type === "hidden") {
    return null;
  }

  const rootClassName = ["lifeos-today-next-up", className].filter(Boolean).join(" ");

  return (
    <Surface
      as="section"
      title="Next up"
      titleLevel={2}
      titleAction={
        <Link href={tasksHref} quiet>
          View tasks
        </Link>
      }
      className={rootClassName}
    >
      <Text tone="secondary" size="xs" className="lifeos-today-next-up__availability">
        {AVAILABILITY_COPY[status.availability]}
      </Text>

      <div
        className="lifeos-today-next-up__body"
        aria-busy={status.type === "loading" || undefined}
      >
        {status.type === "loading" ? (
          <div role="status" aria-label="Loading next task">
            <VisuallyHidden>Loading next task.</VisuallyHidden>
            <SkeletonCard lines={2} />
          </div>
        ) : null}

        {status.type === "empty" ? (
          <EmptyState
            variant="first-use"
            title="No open task is next"
            description="Add or plan a Task when there is another action to take."
            icon={false}
            primaryAction={
              <Link href={tasksHref} quiet>
                Open tasks
              </Link>
            }
          />
        ) : null}

        {status.type === "error" ? (
          <ErrorState
            scope="region"
            title="The next task couldn't load."
            description={status.message}
            {...(onRetry ? { onRetry } : {})}
          />
        ) : null}

        {status.type === "ready" ? (
          <div className="lifeos-today-next-up__task">
            <div className="lifeos-today-next-up__task-heading">
              <div className="lifeos-today-next-up__task-title-group">
                <Link
                  href={status.task.href}
                  quiet
                  className="lifeos-today-next-up__task-link"
                  aria-label={`Open task: ${status.task.title}`}
                >
                  {status.task.title}
                  <ArrowRight aria-hidden="true" />
                </Link>
                {status.task.projectName ? (
                  <Text tone="secondary" size="sm" className="lifeos-today-next-up__project">
                    {status.task.projectName}
                  </Text>
                ) : null}
              </div>

              <div className="lifeos-today-next-up__badges">
                <Badge tone={PRIORITY_TONE[status.task.priority] ?? "neutral"}>
                  {PRIORITY_LABEL[status.task.priority]}
                </Badge>
                {status.task.timingLabel ? <Badge>{status.task.timingLabel}</Badge> : null}
              </div>
            </div>

            <div className="lifeos-today-next-up__explanation">
              <Text size="sm" weight="semibold">
                Why this is next
              </Text>
              <Text tone="secondary" size="sm">
                {status.rankingExplanation}
              </Text>
            </div>

            {onStartFocus ? (
              <Button
                variant="secondary"
                size="sm"
                iconStart={Play}
                disabled={startFocusDisabled}
                loading={startFocusPending}
                loadingLabel="Starting focus"
                onClick={() => onStartFocus(status.task.id)}
              >
                Start focus
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <dl className="lifeos-today-next-up__provenance">
        <div>
          <dt>Source</dt>
          <dd>{sourceLabel}</dd>
        </div>
        <div>
          <dt>Ranking</dt>
          <dd>{rankingRule}</dd>
        </div>
      </dl>
    </Surface>
  );
}
