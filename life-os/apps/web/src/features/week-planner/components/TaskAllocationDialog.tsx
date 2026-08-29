import { useMemo, useRef, useState } from "react";

import { FormDialog } from "@components/feedback";
import { NumberInput, Select } from "@components/ui";

import type {
  TaskAllocationValue,
  WeekPlannerDayOption,
  WeekPlannerTask,
  WeeklyOutcome,
} from "../model/weekPlanner";

export type TaskAllocationMode = "allocate" | "move" | "carry";

export interface TaskAllocationDialogProps {
  readonly open: boolean;
  readonly task: WeekPlannerTask | null;
  readonly mode: TaskAllocationMode;
  readonly days: readonly WeekPlannerDayOption[];
  readonly outcomes?: readonly WeeklyOutcome[];
  readonly initialValue?: Partial<TaskAllocationValue>;
  readonly pending?: boolean;
  readonly error?: string;
  readonly onClose: () => void;
  readonly onSubmit: (taskId: string, value: TaskAllocationValue, mode: TaskAllocationMode) => void;
}

const DEFAULT_PLANNED_MINUTES = 30;

function modeCopy(mode: TaskAllocationMode) {
  switch (mode) {
    case "move":
      return {
        title: "Move task",
        description: "Choose the task's new day, outcome, and planned time.",
        submitLabel: "Move task",
        pendingLabel: "Moving task…",
      };
    case "carry":
      return {
        title: "Carry task to this week",
        description: "Keep the task unscheduled or choose a day, outcome, and planned time.",
        submitLabel: "Carry task",
        pendingLabel: "Carrying task…",
      };
    case "allocate":
      return {
        title: "Allocate task",
        description: "Choose a day, outcome, and planned time for this task.",
        submitLabel: "Allocate task",
        pendingLabel: "Allocating task…",
      };
  }
}

type TaskAllocationDialogContentProps = Omit<TaskAllocationDialogProps, "task"> & {
  readonly task: WeekPlannerTask;
};

export function TaskAllocationDialog(props: TaskAllocationDialogProps) {
  if (!props.open || props.task === null) {
    return null;
  }

  return (
    <TaskAllocationDialogContent
      key={`${props.task.id}-${props.mode}`}
      {...props}
      task={props.task}
    />
  );
}

function TaskAllocationDialogContent({
  open,
  task,
  mode,
  days,
  outcomes = [],
  initialValue,
  pending = false,
  error,
  onClose,
  onSubmit,
}: TaskAllocationDialogContentProps) {
  const initialLocalDate = initialValue?.localDate ?? "";
  const initialOutcomeId = initialValue?.outcomeId ?? "";
  const initialPlannedMinutes =
    initialValue?.plannedMinutes ?? task.estimateMinutes ?? DEFAULT_PLANNED_MINUTES;
  const [localDate, setLocalDate] = useState(initialLocalDate);
  const [outcomeId, setOutcomeId] = useState(initialOutcomeId);
  const [plannedMinutes, setPlannedMinutes] = useState<number | string>(initialPlannedMinutes);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const daySelectRef = useRef<HTMLSelectElement>(null);
  const copy = modeCopy(mode);

  const selectedOutcomeOptions = useMemo(
    () =>
      outcomes
        .filter((outcome) => outcome.selected)
        .map((outcome) => ({ value: outcome.id, label: outcome.title })),
    [outcomes],
  );

  const numericMinutes = plannedMinutes === "" ? Number.NaN : Number(plannedMinutes);
  const dayError =
    attemptedSubmit && mode !== "carry" && localDate === "" ? "Choose a day." : undefined;
  const minutesError = attemptedSubmit
    ? !Number.isInteger(numericMinutes) || numericMinutes < 0 || numericMinutes > 1440
      ? "Enter planned time from 0 to 1,440 minutes."
      : undefined
    : undefined;
  const isDirty =
    localDate !== initialLocalDate ||
    outcomeId !== initialOutcomeId ||
    String(plannedMinutes) !== String(initialPlannedMinutes);

  function submit() {
    setAttemptedSubmit(true);
    if (dayError || minutesError || (mode !== "carry" && localDate === "")) {
      return;
    }
    if (!Number.isInteger(numericMinutes) || numericMinutes < 0 || numericMinutes > 1440) {
      return;
    }
    onSubmit(
      task.id,
      {
        localDate: localDate === "" ? null : localDate,
        outcomeId: outcomeId === "" ? null : outcomeId,
        plannedMinutes: numericMinutes,
      },
      mode,
    );
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={submit}
      title={task ? `${copy.title}: “${task.title}”` : copy.title}
      description={copy.description}
      submitLabel={copy.submitLabel}
      pendingLabel={copy.pendingLabel}
      pending={pending}
      isDirty={isDirty}
      initialFocusRef={daySelectRef}
      {...(error ? { error } : {})}
    >
      <Select
        ref={daySelectRef}
        label="Day"
        value={localDate}
        required={mode !== "carry"}
        placeholder={mode === "carry" ? "Keep unscheduled" : "Choose a day"}
        options={days.map((day) => ({
          value: day.localDate,
          label: day.label,
          ...(day.disabled ? { disabled: true } : {}),
        }))}
        {...(dayError ? { error: dayError } : {})}
        onChange={(event) => {
          setLocalDate(event.target.value);
          setAttemptedSubmit(false);
        }}
      />
      <Select
        label="Weekly outcome (optional)"
        value={outcomeId}
        placeholder="No outcome"
        options={selectedOutcomeOptions}
        onChange={(event) => setOutcomeId(event.target.value)}
      />
      <NumberInput
        label="Planned time"
        value={plannedMinutes}
        min={0}
        max={1440}
        step={15}
        unit="minutes"
        description="Use 0 when you want to allocate the Task before estimating it."
        {...(minutesError ? { error: minutesError } : {})}
        onChange={(event) => {
          setPlannedMinutes(event.target.value);
          setAttemptedSubmit(false);
        }}
      />
    </FormDialog>
  );
}
