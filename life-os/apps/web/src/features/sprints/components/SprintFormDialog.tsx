import { useState } from "react";
import { DateInput, NumberInput, TextInput, Textarea } from "@components/ui";
import { FormField, FormErrorSummary } from "@components/forms";
import { FormDialog } from "@components/feedback";
import type { SprintStatus } from "../model/sprint";
import "./sprint-form-dialog.css";

export interface SprintFormData {
  readonly id?: string;
  readonly name: string;
  readonly goal?: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly targetCapacityPoints: number;
  readonly status?: SprintStatus;
}

export interface SprintFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: SprintFormData) => Promise<void> | void;
  readonly initialValues?: Partial<SprintFormData> | null;
  readonly mode?: "create" | "edit";
  readonly isPending?: boolean;
  readonly error?: string;
}

export function SprintFormDialog({
  open,
  onClose,
  onSubmit,
  initialValues,
  mode = "create",
  isPending = false,
  error,
}: SprintFormDialogProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [goal, setGoal] = useState(initialValues?.goal ?? "");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? "");
  const [targetCapacityPoints, setTargetCapacityPoints] = useState<number | undefined>(
    initialValues?.targetCapacityPoints ?? 20,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);

  if (open !== prevOpen || initialValues !== prevInitialValues) {
    setPrevOpen(open);
    setPrevInitialValues(initialValues);
    if (open) {
      setName(initialValues?.name ?? "");
      setGoal(initialValues?.goal ?? "");
      setStartDate(initialValues?.startDate ?? "");
      setEndDate(initialValues?.endDate ?? "");
      setTargetCapacityPoints(initialValues?.targetCapacityPoints ?? 20);
      setFieldErrors({});
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Sprint name is required.";
    }

    if (!startDate) {
      errors.startDate = "Start date is required.";
    }

    if (!endDate) {
      errors.endDate = "End date is required.";
    }

    if (startDate && endDate && endDate < startDate) {
      errors.endDate = "End date must be on or after start date.";
    }

    if (targetCapacityPoints === undefined || targetCapacityPoints < 0) {
      errors.targetCapacityPoints = "Capacity must be 0 or greater.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) {
      return;
    }

    onSubmit({
      ...(initialValues?.id ? { id: initialValues.id } : {}),
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate,
      endDate,
      targetCapacityPoints: targetCapacityPoints ?? 0,
      ...(initialValues?.status ? { status: initialValues.status } : {}),
    });
  }

  const title = mode === "create" ? "Create Sprint" : "Edit Sprint";
  const submitLabel = mode === "create" ? "Create Sprint" : "Save Changes";

  const isDirty =
    name !== (initialValues?.name ?? "") ||
    goal !== (initialValues?.goal ?? "") ||
    startDate !== (initialValues?.startDate ?? "") ||
    endDate !== (initialValues?.endDate ?? "") ||
    targetCapacityPoints !== (initialValues?.targetCapacityPoints ?? 20);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={title}
      submitLabel={submitLabel}
      isDirty={isDirty}
      pending={isPending}
      error={error}
    >
      <div className="sprint-form-dialog__fields">
        {Object.keys(fieldErrors).length > 0 ? (
          <FormErrorSummary
            errors={Object.entries(fieldErrors).map(([field, msg]) => ({
              fieldId: field,
              message: msg,
            }))}
          />
        ) : null}

        <FormField name="name" label="Sprint Name" error={fieldErrors.name}>
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 12 - Core Features"
            />
          )}
        </FormField>

        <FormField name="goal" label="Sprint Goal" required={false} error={fieldErrors.goal}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What is the key objective of this sprint?"
              rows={2}
            />
          )}
        </FormField>

        <div className="sprint-form-dialog__grid">
          <FormField name="startDate" label="Start Date" error={fieldErrors.startDate}>
            {(fieldProps) => (
              <DateInput
                {...fieldProps}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            )}
          </FormField>

          <FormField name="endDate" label="End Date" error={fieldErrors.endDate}>
            {(fieldProps) => (
              <DateInput
                {...fieldProps}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            )}
          </FormField>
        </div>

        <FormField
          name="targetCapacityPoints"
          label="Target Capacity (Story Points)"
          error={fieldErrors.targetCapacityPoints}
        >
          {(fieldProps) => (
            <NumberInput
              {...fieldProps}
              value={targetCapacityPoints}
              onChange={(val) => setTargetCapacityPoints(val)}
              min={0}
              step={1}
            />
          )}
        </FormField>
      </div>
    </FormDialog>
  );
}
