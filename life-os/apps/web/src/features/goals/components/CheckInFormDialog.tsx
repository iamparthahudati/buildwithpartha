import { useState } from "react";
import { NumberInput, Textarea, Text } from "@components/ui";
import { FormField, FormErrorSummary } from "@components/forms";
import { FormDialog } from "@components/feedback";
import {
  type Goal,
  calculateGoalProgressPercentage,
  formatGoalProgressValue,
  getGoalProgressExplanation,
} from "../model/goal";
import "./check-in-form.css";

export interface CheckInFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (value: number, note?: string) => Promise<void> | void;
  readonly goal: Goal;
  readonly isPending?: boolean;
  readonly error?: string;
}

export function CheckInFormDialog({
  open,
  onClose,
  onSubmit,
  goal,
  isPending = false,
  error,
}: CheckInFormDialogProps) {
  const [value, setValue] = useState<number>(goal.currentValue);
  const [note, setNote] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setValue(goal.currentValue);
      setNote("");
      setFieldErrors({});
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (value === undefined || Number.isNaN(value)) {
      errors.value = "Progress value is required.";
    } else if (goal.progressType === "PERCENTAGE" && (value < 0 || value > 100)) {
      errors.value = "Percentage must be between 0 and 100.";
    } else if (value < 0) {
      errors.value = "Value cannot be negative.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) {
      return;
    }
    onSubmit(value, note.trim() ? note.trim() : undefined);
  }

  const updatedGoal = { ...goal, currentValue: value };
  const pct = calculateGoalProgressPercentage(updatedGoal);
  const formatted = formatGoalProgressValue(updatedGoal);
  const explanation = getGoalProgressExplanation(updatedGoal);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Check In: ${goal.title}`}
      submitLabel="Record Check-in"
      isDirty={value !== goal.currentValue || Boolean(note.trim())}
      pending={isPending}
      {...(error ? { error } : {})}
    >
      <div className="check-in-form-dialog__content">
        {Object.keys(fieldErrors).length > 0 ? <FormErrorSummary /> : null}

        <div className="check-in-form-dialog__summary-box">
          <Text size="xs" weight="medium" tone="muted">
            Resulting Progress: {pct}% ({formatted})
          </Text>
          <Text size="xs" className="check-in-form-dialog__explanation">
            {explanation}
          </Text>
        </div>

        {goal.progressType === "BINARY" ? (
          <div className="check-in-form-dialog__binary">
            <label className="check-in-form-dialog__checkbox-label">
              <input
                type="checkbox"
                checked={value >= 1}
                onChange={(e) => setValue(e.target.checked ? 1 : 0)}
              />
              <Text size="sm">Mark Goal Complete</Text>
            </label>
          </div>
        ) : (
          <FormField
            name="value"
            label={`New Value (${goal.unit || goal.progressType.toLowerCase()})`}
            {...(fieldErrors.value ? { error: fieldErrors.value } : {})}
          >
            {(fieldProps) => (
              <NumberInput
                {...fieldProps}
                value={value}
                onChange={(e) => setValue(e.target.valueAsNumber || 0)}
                step={goal.progressType === "PERCENTAGE" ? 1 : 1}
                min={0}
                {...(goal.progressType === "PERCENTAGE" ? { max: 100 } : {})}
              />
            )}
          </FormField>
        )}

        <FormField name="note" label="Check-in Note" required={false}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add optional notes on your progress..."
              rows={3}
            />
          )}
        </FormField>
      </div>
    </FormDialog>
  );
}
