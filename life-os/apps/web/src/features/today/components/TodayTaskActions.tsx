import { Check, Focus, Star } from "lucide-react";

import { Button } from "@components/ui";

import type { TodayPlanTask, TodayPlanTaskAction } from "../model/todayPlan";

export interface TodayTaskActionsProps {
  readonly task: TodayPlanTask;
  readonly onSetMit: (taskId: string) => void;
  readonly onMarkDone: (taskId: string) => void;
  readonly onStartFocus: (taskId: string) => void;
  readonly compact?: boolean;
}

function actionIsDisabled(task: TodayPlanTask, action: TodayPlanTaskAction): boolean {
  if (task.pendingAction === action) return false;
  return task.pendingAction !== undefined || task.disabledActions?.includes(action) === true;
}

/** Task mutations shared by the table row and its responsive card equivalent. */
export function TodayTaskActions({
  task,
  onSetMit,
  onMarkDone,
  onStartFocus,
  compact = false,
}: TodayTaskActionsProps) {
  if (task.status === "DONE") return null;

  const size = compact ? "sm" : "md";

  return (
    <div className="lifeos-today-task-actions" aria-label={`Actions for ${task.title}`}>
      {!task.isMit ? (
        <Button
          variant="ghost"
          size={size}
          iconStart={Star}
          loading={task.pendingAction === "set-mit"}
          loadingLabel={`Setting ${task.title} as today's MIT`}
          disabled={actionIsDisabled(task, "set-mit")}
          onClick={() => onSetMit(task.id)}
        >
          Set as MIT
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size={size}
        iconStart={Check}
        loading={task.pendingAction === "mark-done"}
        loadingLabel={`Marking ${task.title} done`}
        disabled={actionIsDisabled(task, "mark-done")}
        onClick={() => onMarkDone(task.id)}
      >
        Mark done
      </Button>
      <Button
        variant="ghost"
        size={size}
        iconStart={Focus}
        loading={task.pendingAction === "start-focus"}
        loadingLabel={`Starting focus for ${task.title}`}
        disabled={actionIsDisabled(task, "start-focus")}
        onClick={() => onStartFocus(task.id)}
      >
        Start focus
      </Button>
    </div>
  );
}
