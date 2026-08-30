import { useState } from "react";

import { FormDialog } from "@components/feedback";
import { FormErrorSummary, FormField } from "@components/forms";
import { NumberInput, Select, Textarea } from "@components/ui";

import type { SprintTask } from "../model/sprint";

export interface SprintTaskOption {
  readonly id: string;
  readonly label: string;
  readonly projectId?: string;
  readonly projectName?: string;
  readonly estimateMinutes?: number;
}

const NO_PROJECT_FILTER = "__none__";

/** Default story points for a task, using the 1 point = 1 hour convention (min 1). */
function defaultStoryPoints(option: SprintTaskOption | undefined): number {
  const minutes = option?.estimateMinutes ?? 0;
  if (minutes <= 0) return 1;
  return Math.max(1, Math.round(minutes / 60));
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
  const [projectFilter, setProjectFilter] = useState("");
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
      setProjectFilter("");
      setErrors({});
    }
  }

  const editing = initialTask != null;

  const projectFilterOptions = (() => {
    const seen = new Map<string, string>();
    let hasProjectless = false;
    for (const option of taskOptions) {
      if (option.projectId) {
        if (!seen.has(option.projectId)) {
          seen.set(option.projectId, option.projectName ?? "Untitled project");
        }
      } else {
        hasProjectless = true;
      }
    }
    const options = [{ value: "", label: "All projects" }];
    for (const [value, label] of seen) options.push({ value, label });
    if (hasProjectless) options.push({ value: NO_PROJECT_FILTER, label: "No project" });
    return options;
  })();

  const filteredTaskOptions = taskOptions.filter((option) => {
    if (projectFilter === "") return true;
    if (projectFilter === NO_PROJECT_FILTER) return !option.projectId;
    return option.projectId === projectFilter;
  });

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
      {!editing && projectFilterOptions.length > 2 ? (
        <FormField name="projectFilter" label="Project" required={false}>
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={projectFilter}
              options={projectFilterOptions}
              onChange={(event) => {
                const nextProject = event.target.value;
                setProjectFilter(nextProject);
                setTaskId((current) => {
                  if (!current) return current;
                  const stillVisible = taskOptions.some(
                    (option) =>
                      option.id === current &&
                      (nextProject === "" ||
                        (nextProject === NO_PROJECT_FILTER
                          ? !option.projectId
                          : option.projectId === nextProject)),
                  );
                  return stillVisible ? current : "";
                });
              }}
            />
          )}
        </FormField>
      ) : null}
      <FormField name="taskId" label="Task" {...(errors.taskId ? { error: errors.taskId } : {})}>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={taskId}
            options={filteredTaskOptions.map((task) => ({ value: task.id, label: task.label }))}
            placeholder="Choose a Task"
            disabled={editing}
            onChange={(event) => {
              const nextTaskId = event.target.value;
              setTaskId(nextTaskId);
              setErrors((current) => ({ ...current, taskId: "" }));
              if (!editing && nextTaskId) {
                setStoryPoints(
                  defaultStoryPoints(taskOptions.find((option) => option.id === nextTaskId)),
                );
              }
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
