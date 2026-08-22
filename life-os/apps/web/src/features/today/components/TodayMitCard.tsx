import { Check, Focus, Star } from "lucide-react";

import { EmptyState, ErrorState } from "@components/feedback";
import {
  Badge,
  Button,
  Link,
  LiveRegion,
  PRIORITY_TONE,
  Skeleton,
  Surface,
  TASK_STATUS_TONE,
  Text,
  VisuallyHidden,
} from "@components/ui";

import {
  TODAY_PLAN_PRIORITY_LABEL,
  TODAY_PLAN_STATUS_LABEL,
  type TodayMitState,
  type TodayPlanTaskAction,
} from "../model/todayPlan";

export interface TodayMitCardProps {
  readonly state: TodayMitState;
  readonly tasksHref: string;
  readonly onChooseMit: () => void;
  readonly onChangeMit: (taskId: string) => void;
  readonly onMarkDone: (taskId: string) => void;
  readonly onStartFocus: (taskId: string) => void;
  readonly onAddTask: () => void;
  readonly onRetry?: () => void;
}

function actionIsDisabled(
  pendingAction: TodayPlanTaskAction | undefined,
  disabledActions: readonly TodayPlanTaskAction[] | undefined,
  action: TodayPlanTaskAction,
): boolean {
  if (pendingAction === action) return false;
  return pendingAction !== undefined || disabledActions?.includes(action) === true;
}

/** The deliberately selected Most Important Task for the user's local date. */
export function TodayMitCard({
  state,
  tasksHref,
  onChooseMit,
  onChangeMit,
  onMarkDone,
  onStartFocus,
  onAddTask,
  onRetry,
}: TodayMitCardProps) {
  return (
    <Surface
      as="section"
      title="Today's focus"
      titleLevel={3}
      tone="muted"
      className="lifeos-today-mit-card"
    >
      {state.type === "loading" ? (
        <div className="lifeos-today-mit-card__loading">
          <LiveRegion message="Loading today's focus…" />
          <Skeleton width="7rem" />
          <Skeleton width="70%" height="var(--lifeos-font-size-lg)" />
          <Skeleton width="45%" />
          <div className="lifeos-today-mit-card__actions" aria-hidden="true">
            <Skeleton shape="block" width="7rem" height="2.5rem" />
            <Skeleton shape="block" width="7rem" height="2.5rem" />
          </div>
        </div>
      ) : state.type === "error" ? (
        <ErrorState
          scope="region"
          title="Today's focus couldn't load."
          description={state.message}
          {...(onRetry ? { onRetry } : {})}
          action={<Link href={tasksHref}>Open Tasks</Link>}
        />
      ) : state.type === "empty" ? (
        <EmptyState
          variant="first-use"
          icon={Star}
          title="Choose today's focus"
          description="Choose one Task as today's most important task, or add a Task first."
          primaryAction={<Button onClick={onChooseMit}>Choose focus</Button>}
          secondaryAction={
            <Button variant="secondary" onClick={onAddTask}>
              Add task
            </Button>
          }
        />
      ) : (
        <div className="lifeos-today-mit-card__content">
          <div className="lifeos-today-mit-card__badges">
            <Badge tone="accent" icon={Star}>
              MIT<VisuallyHidden> — Most Important Task</VisuallyHidden>
            </Badge>
            <Badge tone={PRIORITY_TONE[state.task.priority] ?? "neutral"}>
              {TODAY_PLAN_PRIORITY_LABEL[state.task.priority]}
            </Badge>
            <Badge tone={TASK_STATUS_TONE[state.task.status] ?? "neutral"}>
              {TODAY_PLAN_STATUS_LABEL[state.task.status]}
            </Badge>
          </div>

          <Link href={state.task.href} className="lifeos-today-mit-card__title">
            {state.task.title}
          </Link>

          {state.task.project ? (
            state.task.project.href ? (
              <Link href={state.task.project.href} quiet>
                {state.task.project.name}
              </Link>
            ) : (
              <Text tone="secondary" size="sm">
                {state.task.project.name}
              </Text>
            )
          ) : (
            <Text tone="muted" size="sm">
              No project
            </Text>
          )}

          {state.task.dueLabel ? (
            <Text tone="secondary" size="sm">
              {state.task.dueLabel}
            </Text>
          ) : null}

          <div className="lifeos-today-mit-card__actions">
            <Button
              variant="primary"
              iconStart={Focus}
              loading={state.task.pendingAction === "start-focus"}
              loadingLabel={`Starting focus for ${state.task.title}`}
              disabled={actionIsDisabled(
                state.task.pendingAction,
                state.task.disabledActions,
                "start-focus",
              )}
              onClick={() => onStartFocus(state.task.id)}
            >
              Start focus
            </Button>
            <Button
              variant="secondary"
              iconStart={Check}
              loading={state.task.pendingAction === "mark-done"}
              loadingLabel={`Marking ${state.task.title} done`}
              disabled={actionIsDisabled(
                state.task.pendingAction,
                state.task.disabledActions,
                "mark-done",
              )}
              onClick={() => onMarkDone(state.task.id)}
            >
              Mark done
            </Button>
            <Link href={state.task.href}>Open task</Link>
            <Button
              variant="link"
              disabled={state.task.pendingAction !== undefined}
              onClick={() => onChangeMit(state.task.id)}
            >
              Change MIT
            </Button>
          </div>
        </div>
      )}
    </Surface>
  );
}
