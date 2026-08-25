import { useState } from "react";
import { Button, Heading, NumberInput, Text, Textarea } from "@components/ui";
import { FormField } from "@components/forms";
import {
  type Goal,
  calculateGoalProgressPercentage,
  formatGoalProgressValue,
  getGoalProgressExplanation,
} from "../model/goal";
import "./progress-editor.css";

export interface ProgressEditorProps {
  readonly goal: Goal;
  readonly linkedWorkCount?: number;
  readonly onSaveProgress: (newValue: number, note?: string) => void;
  readonly onCancel?: () => void;
  readonly isSubmitting?: boolean;
  readonly className?: string;
}

export function ProgressEditor({
  goal,
  linkedWorkCount = 0,
  onSaveProgress,
  onCancel,
  isSubmitting = false,
  className,
}: ProgressEditorProps) {
  const [value, setValue] = useState<number>(goal.currentValue);
  const [note, setNote] = useState<string>("");

  const updatedGoal = { ...goal, currentValue: value };
  const calculatedPercentage = calculateGoalProgressPercentage(updatedGoal);
  const formattedValue = formatGoalProgressValue(updatedGoal);
  const explanation = getGoalProgressExplanation(updatedGoal, linkedWorkCount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProgress(value, note.trim() ? note.trim() : undefined);
  };

  const handleIncrement = (delta: number) => {
    setValue((prev) => {
      const next = prev + delta;
      if (goal.progressType === "PERCENTAGE") {
        return Math.min(100, Math.max(0, next));
      }
      if (goal.progressType === "BINARY") {
        return next >= 1 ? 1 : 0;
      }
      return Math.max(0, next);
    });
  };

  return (
    <form
      aria-label={`Edit progress for ${goal.title}`}
      className={["progress-editor", className].filter(Boolean).join(" ")}
      onSubmit={handleSubmit}
    >
      <header className="progress-editor__header">
        <Heading level={3} size="sm">
          Update Goal Progress
        </Heading>
        <Text size="xs" tone="muted">
          {goal.title} ({goal.category})
        </Text>
      </header>

      <div className="progress-editor__current">
        <div className="progress-editor__current-value">
          <Text size="xs" tone="muted">
            New Progress:
          </Text>
          <Text size="lg" weight="bold">
            {calculatedPercentage}%
          </Text>
          <Text size="xs" tone="muted">
            ({formattedValue})
          </Text>
        </div>
        <div
          className="progress-editor__bar-bg"
          role="progressbar"
          aria-valuenow={calculatedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress percentage for ${goal.title}`}
        >
          <div
            className="progress-editor__bar-fill"
            style={{ width: `${calculatedPercentage}%` }}
          />
        </div>
      </div>

      <div className="progress-editor__explanation-box">
        <Text size="xs" weight="medium" tone="muted">
          Calculation Rule:
        </Text>
        <Text size="xs" className="progress-editor__explanation-text">
          {explanation}
        </Text>
      </div>

      {goal.progressType === "BINARY" ? (
        <div className="progress-editor__binary">
          <label className="progress-editor__checkbox-label">
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
          label={`Current Value (${goal.unit || goal.progressType.toLowerCase()})`}
        >
          {(fieldProps) => (
            <div className="progress-editor__input-group">
              <NumberInput
                {...fieldProps}
                value={value}
                onChange={(e) => setValue(e.target.valueAsNumber || 0)}
                step={goal.progressType === "PERCENTAGE" ? 1 : 1}
                min={0}
                {...(goal.progressType === "PERCENTAGE" ? { max: 100 } : {})}
              />
              <div className="progress-editor__quick-buttons">
                {goal.progressType === "PERCENTAGE" ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleIncrement(5)}
                    >
                      +5%
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleIncrement(25)}
                    >
                      +25%
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setValue(100)}
                    >
                      100%
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleIncrement(1)}
                    >
                      +1
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleIncrement(5)}
                    >
                      +5
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleIncrement(10)}
                    >
                      +10
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </FormField>
      )}

      <FormField name="note" label="Check-in Note" required={false}>
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What progress did you make or what changed?"
          />
        )}
      </FormField>

      <footer className="progress-editor__actions">
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Progress Check-in"}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        ) : null}
      </footer>
    </form>
  );
}
