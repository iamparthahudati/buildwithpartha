import { useState } from "react";

import { FormDialog } from "@components/feedback";
import { FormErrorSummary, FormField } from "@components/forms";
import { NumberInput, Select, Textarea } from "@components/ui";

import type { SprintTask } from "../model/sprint";

export interface SprintTaskOption {
  readonly id: string;
  readonly label: string;
}

export interface SprintTaskFormData {
  readonly taskId: string;
  readonly storyPoints: number;
  readonly reason?: string;
}

export interface SprintTaskDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: SprintTaskFormData) => Promise<void> | void;
  readonly taskOptions: readonly SprintTaskOption[];
  readonly initialTask?: SprintTask | null;
  readonly pending?: boolean;
  readonly error?: string;
}

export function SprintTaskDialog({
  open,
  onClose,
  onSubmit,
  taskOptions,
  initialTask,
  pending = false,
  error,
}: SprintTaskDialogProps) {
  const [taskId, setTaskId] = useState(initialTask?.taskId ?? "");
  const [storyPoints, setStoryPoints] = useState<number | undefined>(initialTask?.storyPoints ?? 1);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previousOpen, setPreviousOpen] = useState(open);
  const [previousTask, setPreviousTask] = useState(initialTask);

  if (open !== previousOpen || initialTask !== previousTask) {
    setPreviousOpen(open);
    setPreviousTask(initialTask);
    if (open) {
      setTaskId(initialTask?.taskId ?? "");
      setStoryPoints(initialTask?.storyPoints ?? 1);
      setReason("");
      setErrors({});
    }
  }

  function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!taskId) nextErrors.taskId = "Choose a Task.";
    if (storyPoints === undefined || storyPoints < 0) {
      nextErrors.storyPoints = "Story points must be 0 or greater.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    void onSubmit({
      taskId,
      storyPoints: storyPoints ?? 0,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
  }

  const editing = initialTask != null;
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={editing ? `Edit commitment — ${initialTask.title}` : "Add Task to Sprint"}
      submitLabel={editing ? "Update commitment" : "Add Task to Sprint"}
      pending={pending}
      {...(error ? { error } : {})}
    >
      {Object.keys(errors).length > 0 ? <FormErrorSummary /> : null}
      <FormField name="taskId" label="Task" {...(errors.taskId ? { error: errors.taskId } : {})}>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={taskId}
            options={taskOptions.map((task) => ({ value: task.id, label: task.label }))}
            placeholder="Choose a Task"
            disabled={editing}
            onChange={(event) => {
              setTaskId(event.target.value);
              setErrors((current) => ({ ...current, taskId: "" }));
            }}
          />
        )}
      </FormField>
      <FormField
        name="storyPoints"
        label="Story Points"
        {...(errors.storyPoints ? { error: errors.storyPoints } : {})}
      >
        {(fieldProps) => (
          <NumberInput
            {...fieldProps}
            min={0}
            step={1}
            value={storyPoints ?? ""}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              setStoryPoints(Number.isNaN(value) ? undefined : value);
            }}
          />
        )}
      </FormField>
      <FormField name="reason" label="Reason for scope change" required={false}>
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            value={reason}
            rows={2}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional context for this change"
          />
        )}
      </FormField>
    </FormDialog>
  );
}
