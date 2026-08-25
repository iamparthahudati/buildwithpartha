import { useState, useEffect, useMemo, useRef } from "react";
import { TextInput, Textarea, Select, Button, DateInput } from "@components/ui";
import { FormFieldGroup, FormField, FormErrorSummary } from "@components/forms";
import { FormDialog, Alert } from "@components/feedback";
import type { GoalProgressType, GoalStatus, CheckInCadence } from "../model/goal";
import "./goal-form.css";

export interface GoalFormData {
  readonly id?: string;
  readonly title: string;
  readonly description?: string | null;
  readonly category: string;
  readonly progressType: GoalProgressType;
  readonly targetValue?: number | null;
  readonly currentValue?: number | null;
  readonly unit?: string | null;
  readonly targetDate?: string | null;
  readonly status: GoalStatus;
  readonly checkInCadence: CheckInCadence;
  readonly version?: number;
}

export interface GoalFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: GoalFormData) => Promise<void> | void;
  readonly initialValues?: Partial<GoalFormData> | null;
  readonly mode?: "create" | "edit";
  readonly isPending?: boolean;
  readonly error?: string | null;
  readonly conflictError?: string | null;
  readonly onResolveConflict?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "PERSONAL", label: "Personal" },
  { value: "WORK", label: "Work" },
  { value: "HEALTH", label: "Health & Fitness" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "LEARNING", label: "Learning" },
  { value: "CAREER", label: "Career" },
];

const PROGRESS_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage (0 - 100%)" },
  { value: "NUMERIC", label: "Numeric Target" },
  { value: "MILESTONE", label: "Milestone Target" },
  { value: "BINARY", label: "Binary (Done / Not Done)" },
];

const CADENCE_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "MANUAL", label: "Manual" },
];

const STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function GoalFormDialog({
  open,
  onClose,
  onSubmit,
  initialValues,
  mode = "create",
  isPending = false,
  error,
  conflictError,
  onResolveConflict,
}: GoalFormDialogProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "PERSONAL");
  const [progressType, setProgressType] = useState<GoalProgressType>(
    initialValues?.progressType ?? "PERCENTAGE",
  );
  const [targetValue, setTargetValue] = useState<string>(
    initialValues?.targetValue !== undefined && initialValues?.targetValue !== null
      ? String(initialValues.targetValue)
      : "100",
  );
  const [currentValue, setCurrentValue] = useState<string>(
    initialValues?.currentValue !== undefined && initialValues?.currentValue !== null
      ? String(initialValues.currentValue)
      : "0",
  );
  const [unit, setUnit] = useState(initialValues?.unit ?? "");
  const [targetDate, setTargetDate] = useState(initialValues?.targetDate ?? "");
  const [checkInCadence, setCheckInCadence] = useState<CheckInCadence>(
    initialValues?.checkInCadence ?? "WEEKLY",
  );
  const [status, setStatus] = useState<GoalStatus>(initialValues?.status ?? "NOT_STARTED");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(initialValues?.title ?? "");
      setDescription(initialValues?.description ?? "");
      setCategory(initialValues?.category ?? "PERSONAL");
      setProgressType(initialValues?.progressType ?? "PERCENTAGE");
      setTargetValue(
        initialValues?.targetValue !== undefined && initialValues?.targetValue !== null
          ? String(initialValues.targetValue)
          : "100",
      );
      setCurrentValue(
        initialValues?.currentValue !== undefined && initialValues?.currentValue !== null
          ? String(initialValues.currentValue)
          : "0",
      );
      setUnit(initialValues?.unit ?? "");
      setTargetDate(initialValues?.targetDate ?? "");
      setCheckInCadence(initialValues?.checkInCadence ?? "WEEKLY");
      setStatus(initialValues?.status ?? "NOT_STARTED");
      setFieldErrors({});
    }
  }, [open, initialValues]);

  const isDirty = useMemo(() => {
    if (!open) return false;
    return (
      title !== (initialValues?.title ?? "") ||
      description !== (initialValues?.description ?? "") ||
      category !== (initialValues?.category ?? "PERSONAL") ||
      progressType !== (initialValues?.progressType ?? "PERCENTAGE") ||
      targetValue !==
        (initialValues?.targetValue !== undefined && initialValues?.targetValue !== null
          ? String(initialValues.targetValue)
          : "100") ||
      currentValue !==
        (initialValues?.currentValue !== undefined && initialValues?.currentValue !== null
          ? String(initialValues.currentValue)
          : "0") ||
      unit !== (initialValues?.unit ?? "") ||
      targetDate !== (initialValues?.targetDate ?? "") ||
      checkInCadence !== (initialValues?.checkInCadence ?? "WEEKLY") ||
      status !== (initialValues?.status ?? "NOT_STARTED")
    );
  }, [
    open,
    initialValues,
    title,
    description,
    category,
    progressType,
    targetValue,
    currentValue,
    unit,
    targetDate,
    checkInCadence,
    status,
  ]);

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = "Goal title is required.";
    }
    if (!category.trim()) {
      errors.category = "Category is required.";
    }

    const parsedTarget = Number(targetValue);
    const parsedCurrent = Number(currentValue);

    if (
      (progressType === "NUMERIC" || progressType === "MILESTONE") &&
      (Number.isNaN(parsedTarget) || parsedTarget <= 0)
    ) {
      errors.targetValue = "Target value must be greater than 0.";
    }

    if (Number.isNaN(parsedCurrent) || parsedCurrent < 0) {
      errors.currentValue = "Current value cannot be negative.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      errorSummaryRef.current?.focus();
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim(),
      progressType,
      targetValue:
        progressType === "BINARY" ? 1 : progressType === "PERCENTAGE" ? 100 : parsedTarget,
      currentValue: parsedCurrent,
      unit: unit.trim() || null,
      targetDate: targetDate || null,
      status,
      checkInCadence,
    });
  };

  const dialogTitle = mode === "edit" ? "Edit goal" : "Create goal";
  const submitLabel = mode === "edit" ? "Save changes" : "Create goal";

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={dialogTitle}
      submitLabel={submitLabel}
      isDirty={isDirty}
      pending={isPending}
      {...(error ? { error } : {})}
      className="lifeos-goal-form-dialog"
    >
      <FormFieldGroup>
        <FormErrorSummary ref={errorSummaryRef} title="Fix the following errors before saving" />

        {conflictError ? (
          <Alert tone="danger" heading="Version Conflict">
            <p>{conflictError}</p>
            {onResolveConflict ? (
              <Button type="button" variant="secondary" onClick={onResolveConflict}>
                Reload latest data
              </Button>
            ) : null}
          </Alert>
        ) : null}

        <div className="lifeos-goal-form">
          <FormField
            name="title"
            label="Goal title"
            {...(fieldErrors.title ? { error: fieldErrors.title } : {})}
          >
            {(fieldProps) => (
              <TextInput
                {...fieldProps}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read 12 Books"
              />
            )}
          </FormField>

          <FormField
            name="description"
            label="Description"
            required={false}
            {...(fieldErrors.description ? { error: fieldErrors.description } : {})}
          >
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your goal objective and motivation..."
                rows={3}
              />
            )}
          </FormField>

          <div className="lifeos-goal-form__grid">
            <FormField
              name="category"
              label="Category"
              {...(fieldErrors.category ? { error: fieldErrors.category } : {})}
            >
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={CATEGORY_OPTIONS}
                />
              )}
            </FormField>

            <FormField
              name="progressType"
              label="Progress calculation type"
              {...(fieldErrors.progressType ? { error: fieldErrors.progressType } : {})}
            >
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={progressType}
                  onChange={(e) => setProgressType(e.target.value as GoalProgressType)}
                  options={PROGRESS_TYPE_OPTIONS}
                />
              )}
            </FormField>
          </div>

          <div className="lifeos-goal-form__grid">
            {progressType === "NUMERIC" || progressType === "MILESTONE" ? (
              <FormField
                name="targetValue"
                label="Target value"
                {...(fieldErrors.targetValue ? { error: fieldErrors.targetValue } : {})}
              >
                {(fieldProps) => (
                  <TextInput
                    {...fieldProps}
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="e.g. 100"
                  />
                )}
              </FormField>
            ) : null}

            <FormField
              name="currentValue"
              label="Current value"
              {...(fieldErrors.currentValue ? { error: fieldErrors.currentValue } : {})}
            >
              {(fieldProps) => (
                <TextInput
                  {...fieldProps}
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="e.g. 0"
                />
              )}
            </FormField>

            {progressType === "NUMERIC" ? (
              <FormField
                name="unit"
                label="Measurement unit"
                required={false}
                {...(fieldErrors.unit ? { error: fieldErrors.unit } : {})}
              >
                {(fieldProps) => (
                  <TextInput
                    {...fieldProps}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. km, books, hrs"
                  />
                )}
              </FormField>
            ) : null}
          </div>

          <div className="lifeos-goal-form__grid">
            <FormField
              name="checkInCadence"
              label="Check-in cadence"
              {...(fieldErrors.checkInCadence ? { error: fieldErrors.checkInCadence } : {})}
            >
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={checkInCadence}
                  onChange={(e) => setCheckInCadence(e.target.value as CheckInCadence)}
                  options={CADENCE_OPTIONS}
                />
              )}
            </FormField>

            <FormField
              name="status"
              label="Status"
              {...(fieldErrors.status ? { error: fieldErrors.status } : {})}
            >
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GoalStatus)}
                  options={STATUS_OPTIONS}
                />
              )}
            </FormField>

            <FormField
              name="targetDate"
              label="Target date"
              required={false}
              {...(fieldErrors.targetDate ? { error: fieldErrors.targetDate } : {})}
            >
              {(fieldProps) => (
                <DateInput
                  {...fieldProps}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              )}
            </FormField>
          </div>
        </div>
      </FormFieldGroup>
    </FormDialog>
  );
}
