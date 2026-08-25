import { useState, useEffect, useRef } from "react";
import { TextInput, Select } from "@components/ui";
import { FormFieldGroup, FormField, FormErrorSummary } from "@components/forms";
import { FormDialog } from "@components/feedback";
import type { GoalLinkTargetType } from "../model/goal";
import "./goal-link-modal.css";

export interface GoalLinkModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (targetType: GoalLinkTargetType, targetId: string) => Promise<void> | void;
  readonly isPending?: boolean;
  readonly error?: string | null;
}

const TARGET_TYPE_OPTIONS = [
  { value: "PROJECT", label: "Project" },
  { value: "TASK", label: "Task" },
  { value: "HABIT", label: "Habit" },
];

export function GoalLinkModal({
  open,
  onClose,
  onSubmit,
  isPending = false,
  error,
}: GoalLinkModalProps) {
  const [targetType, setTargetType] = useState<GoalLinkTargetType>("PROJECT");
  const [targetId, setTargetId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetType("PROJECT");
      setTargetId("");
      setFieldErrors({});
    }
  }, [open]);

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!targetId.trim()) {
      errors.targetId = "Target ID or reference is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      errorSummaryRef.current?.focus();
      return;
    }

    onSubmit(targetType, targetId.trim());
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="Link Work Item"
      submitLabel="Add Link"
      isDirty={Boolean(targetId.trim())}
      pending={isPending}
      {...(error ? { error } : {})}
      className="lifeos-goal-link-modal-dialog"
    >
      <FormFieldGroup>
        <FormErrorSummary ref={errorSummaryRef} title="Fix the following errors before linking" />

        <div className="lifeos-goal-link-modal">
          <FormField
            name="targetType"
            label="Work item type"
            {...(fieldErrors.targetType ? { error: fieldErrors.targetType } : {})}
          >
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as GoalLinkTargetType)}
                options={TARGET_TYPE_OPTIONS}
              />
            )}
          </FormField>

          <FormField
            name="targetId"
            label="Work item ID or reference"
            {...(fieldErrors.targetId ? { error: fieldErrors.targetId } : {})}
          >
            {(fieldProps) => (
              <TextInput
                {...fieldProps}
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Enter project, task, or habit ID..."
              />
            )}
          </FormField>
        </div>
      </FormFieldGroup>
    </FormDialog>
  );
}
