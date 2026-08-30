import { useEffect, useRef, useState } from "react";

import { Alert, FormDialog } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { Button, NumberInput, Select, Textarea, TextInput } from "@components/ui";

import {
  DEFAULT_HABIT_TIMEZONE_OPTIONS,
  HABIT_CADENCE_OPTIONS,
  HABIT_COLOR_OPTIONS,
  type HabitCadence,
  type HabitColor,
  type HabitFormValues,
} from "../model/habit";
import { HabitReminderFields } from "./HabitReminderFields";
import "./habit-form-dialog.css";

export interface HabitFormDialogProps {
  readonly open: boolean;
  readonly mode?: "create" | "edit";
  readonly initialValues?: Partial<HabitFormValues> | null;
  readonly timeZoneOptions?: readonly { readonly value: string; readonly label: string }[];
  readonly pending?: boolean;
  readonly error?: string | null;
  readonly conflictError?: string | null;
  readonly onLoadLatest?: () => void;
  readonly onClose: () => void;
  readonly onSubmit: (values: HabitFormValues) => void;
}

interface FieldErrors {
  name?: string;
  description?: string;
  targetCount?: string;
  timeZone?: string;
  reminderTime?: string;
}

function formDefaults(initialValues?: Partial<HabitFormValues> | null) {
  return {
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    cadence: initialValues?.cadence ?? ("DAILY" as HabitCadence),
    targetCount: String(initialValues?.targetCount ?? 1),
    timeZone: initialValues?.timeZone ?? "UTC",
    color: initialValues?.color ?? ("blue" as HabitColor),
    reminderEnabled: initialValues?.reminderEnabled ?? false,
    reminderTime: initialValues?.reminderTime ?? "",
  };
}

function validateHabitForm(values: ReturnType<typeof formDefaults>): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = "Enter a Habit name.";
  else if (values.name.trim().length > 200) errors.name = "Use 200 characters or fewer.";
  if (values.description.length > 2000) errors.description = "Use 2,000 characters or fewer.";
  const count = Number(values.targetCount);
  if (!Number.isInteger(count) || count <= 0) {
    errors.targetCount = "Enter a whole-number target of 1 or more.";
  }
  if (!values.timeZone) errors.timeZone = "Choose the Habit's timezone.";
  if (values.reminderEnabled && !values.reminderTime) {
    errors.reminderTime = "Choose a reminder time or turn the reminder off.";
  }
  return errors;
}

export function HabitFormDialog({
  open,
  mode = "create",
  initialValues,
  timeZoneOptions = DEFAULT_HABIT_TIMEZONE_OPTIONS,
  pending = false,
  error,
  conflictError,
  onLoadLatest,
  onClose,
  onSubmit,
}: HabitFormDialogProps) {
  const defaults = formDefaults(initialValues);
  const [name, setName] = useState(defaults.name);
  const [description, setDescription] = useState(defaults.description);
  const [cadence, setCadence] = useState<HabitCadence>(defaults.cadence);
  const [targetCount, setTargetCount] = useState(defaults.targetCount);
  const [timeZone, setTimeZone] = useState(defaults.timeZone);
  const [color, setColor] = useState<HabitColor>(defaults.color);
  const [reminderEnabled, setReminderEnabled] = useState(defaults.reminderEnabled);
  const [reminderTime, setReminderTime] = useState(defaults.reminderTime);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const next = formDefaults(initialValues);
    // Resetting a controlled form when a dialog opens is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(next.name);
    setDescription(next.description);
    setCadence(next.cadence);
    setTargetCount(next.targetCount);
    setTimeZone(next.timeZone);
    setColor(next.color);
    setReminderEnabled(next.reminderEnabled);
    setReminderTime(next.reminderTime);
    setFieldErrors({});
  }, [initialValues, open]);

  const currentValues = {
    name,
    description,
    cadence,
    targetCount,
    timeZone,
    color,
    reminderEnabled,
    reminderTime,
  };
  const dirty = JSON.stringify(currentValues) !== JSON.stringify(defaults);

  function submit() {
    const errors = validateHabitForm(currentValues);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      cadence,
      targetCount: Number(targetCount),
      timeZone,
      color,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime || null : null,
      ...(initialValues?.version === undefined ? {} : { version: initialValues.version }),
    });
  }

  const title = mode === "create" ? "Add Habit" : "Edit Habit";
  const submitLabel = mode === "create" ? "Add Habit" : "Save changes";

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={submit}
      title={title}
      description="Set a repeatable behavior, its cadence, and the local timezone used for entries."
      submitLabel={submitLabel}
      pending={pending}
      pendingLabel={mode === "create" ? "Adding Habit…" : "Saving changes…"}
      isDirty={dirty}
      {...(error ? { error } : {})}
      className="habit-form-dialog"
    >
      <FormFieldGroup>
        {Object.keys(fieldErrors).length > 0 ? <FormErrorSummary ref={summaryRef} /> : null}
        {conflictError ? (
          <Alert
            tone="warning"
            heading="This Habit changed elsewhere"
            action={
              onLoadLatest ? (
                <Button size="sm" variant="secondary" onClick={onLoadLatest}>
                  Load latest
                </Button>
              ) : undefined
            }
          >
            {conflictError}
          </Alert>
        ) : null}

        <FormField
          name="name"
          label="Habit name"
          {...(fieldErrors.name ? { error: fieldErrors.name } : {})}
        >
          {(field) => (
            <TextInput
              {...field}
              value={name}
              maxLength={200}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          name="description"
          label="Description"
          required={false}
          {...(fieldErrors.description ? { error: fieldErrors.description } : {})}
        >
          {(field) => (
            <Textarea
              {...field}
              value={description}
              maxLength={2000}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
            />
          )}
        </FormField>

        <div className="habit-form-dialog__grid">
          <FormField name="cadence" label="Cadence">
            {(field) => (
              <Select
                {...field}
                options={HABIT_CADENCE_OPTIONS}
                value={cadence}
                onChange={(event) => setCadence(event.target.value as HabitCadence)}
              />
            )}
          </FormField>

          <FormField
            name="targetCount"
            label="Target count"
            description="Completions needed in each cadence period."
            {...(fieldErrors.targetCount ? { error: fieldErrors.targetCount } : {})}
          >
            {(field) => (
              <NumberInput
                {...field}
                min={1}
                step={1}
                value={targetCount}
                onChange={(event) => setTargetCount(event.target.value)}
              />
            )}
          </FormField>

          <FormField
            name="timeZone"
            label="Timezone"
            description="New entries use this timezone. Existing local dates do not move."
            {...(fieldErrors.timeZone ? { error: fieldErrors.timeZone } : {})}
          >
            {(field) => (
              <Select
                {...field}
                options={timeZoneOptions}
                value={timeZone}
                onChange={(event) => setTimeZone(event.target.value)}
              />
            )}
          </FormField>

          <FormField name="color" label="Color">
            {(field) => (
              <Select
                {...field}
                options={HABIT_COLOR_OPTIONS}
                value={color}
                onChange={(event) => setColor(event.target.value as HabitColor)}
              />
            )}
          </FormField>
        </div>

        <HabitReminderFields
          enabled={reminderEnabled}
          time={reminderTime}
          disabled={pending}
          {...(fieldErrors.reminderTime ? { timeError: fieldErrors.reminderTime } : {})}
          onEnabledChange={setReminderEnabled}
          onTimeChange={setReminderTime}
        />
      </FormFieldGroup>
    </FormDialog>
  );
}
