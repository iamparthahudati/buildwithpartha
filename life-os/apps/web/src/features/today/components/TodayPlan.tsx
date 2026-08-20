import { Surface } from "@components/ui";

import type { TodayMitState, TodayTaskListState } from "../model/todayPlan";
import { TodayMitCard } from "./TodayMitCard";
import { TodayTaskList } from "./TodayTaskList";
import "./today-plan.css";

/**
 * TodayPlan (LOS-0609).
 *
 * The daily decision surface: the local-date MIT comes first, followed by the
 * deliberately limited Today Task projection. Each region has an independent
 * loading/empty/error/ready state so a failed list never suppresses a usable
 * MIT (and vice versa). This component owns presentation and action routing
 * only; LOS-0615 connects canonical Task/MIT APIs and mutation invalidation.
 */
export interface TodayPlanProps {
  readonly mitState: TodayMitState;
  readonly tasksState: TodayTaskListState;
  readonly tasksHref?: string;
  readonly onChooseMit: () => void;
  readonly onChangeMit: (taskId: string) => void;
  readonly onSetMit: (taskId: string) => void;
  readonly onMarkDone: (taskId: string) => void;
  readonly onStartFocus: (taskId: string) => void;
  readonly onAddTask: () => void;
  readonly onRetryMit?: () => void;
  readonly onRetryTasks?: () => void;
  readonly className?: string;
}

export function TodayPlan({
  mitState,
  tasksState,
  tasksHref = "/life-os/app/tasks",
  onChooseMit,
  onChangeMit,
  onSetMit,
  onMarkDone,
  onStartFocus,
  onAddTask,
  onRetryMit,
  onRetryTasks,
  className,
}: TodayPlanProps) {
  return (
    <Surface
      as="section"
      title="Today's plan"
      titleLevel={2}
      padding="lg"
      className={["lifeos-today-plan", className].filter(Boolean).join(" ")}
    >
      <div className="lifeos-today-plan__layout">
        <TodayMitCard
          state={mitState}
          tasksHref={tasksHref}
          onChooseMit={onChooseMit}
          onChangeMit={onChangeMit}
          onMarkDone={onMarkDone}
          onStartFocus={onStartFocus}
          onAddTask={onAddTask}
          {...(onRetryMit ? { onRetry: onRetryMit } : {})}
        />
        <TodayTaskList
          state={tasksState}
          tasksHref={tasksHref}
          onAddTask={onAddTask}
          onSetMit={onSetMit}
          onMarkDone={onMarkDone}
          onStartFocus={onStartFocus}
          {...(onRetryTasks ? { onRetry: onRetryTasks } : {})}
        />
      </div>
    </Surface>
  );
}
