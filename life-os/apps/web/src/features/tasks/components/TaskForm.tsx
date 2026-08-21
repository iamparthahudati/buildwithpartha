import { useEffect, useMemo, useRef, useState, type RefCallback } from "react";

import { Alert, FormDialog } from "@components/feedback";
import {
  Combobox,
  DateTimeField,
  DurationField,
  FormErrorSummary,
  FormField,
  FormFieldGroup,
  type ComboboxOption,
  type DateTimeValue,
} from "@components/forms";
import { Button, Checkbox, NumberInput, Select, TextInput, Textarea } from "@components/ui";
import {
  formatLocalDate,
  resolveLocalDateTime,
  todayLocalDate,
  type LocalDate,
  type LocalTime,
} from "@lib/localDateTime";

import type { TaskPriority, TaskStatus } from "../model/task";
import "./task-form.css";

export interface TaskFormProjectOption {
  readonly id: string;
  readonly name: string;
  readonly disabled?: boolean;
}

export interface TaskFormLabelOption {
  readonly id: string;
  readonly name: string;
  readonly disabled?: boolean;
}

export interface TaskFormData {
  readonly id?: string;
  readonly projectId: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  /** UTC instant for the API. */
  readonly dueAt: string | null;
  readonly estimateMinutes: number | null;
  readonly progress: number;
  /** User-local calendar date, not an instant. */
  readonly mitDate: LocalDate | null;
  readonly labelIds: readonly string[];
  readonly version?: number;
}

export interface TaskFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: TaskFormData) => Promise<void> | void;
  readonly initialValues?: Partial<TaskFormData> | null;
  readonly mode?: "create" | "edit";
  readonly presentation?: "full" | "quick-add";
  readonly timeZone: string;
  readonly locale: string;
  readonly projects?: readonly TaskFormProjectOption[];
  readonly labels?: readonly TaskFormLabelOption[];
  readonly labelsLoading?: boolean;
  readonly isPending?: boolean;
  readonly error?: string;
  readonly conflictError?: string;
  readonly onReloadLatest?: () => void;
}

interface TaskFormState {
  readonly title: string;
  readonly projectId: string | null;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly due: DateTimeValue;
  readonly estimateMinutes: number | null;
  readonly progress: number | "";
  readonly labelIds: readonly string[];
  readonly isMit: boolean;
  readonly mitDate: LocalDate;
}

type FieldErrors = Partial<Record<"title" | "dueAt" | "estimateMinutes" | "progress", string>>;

const STATUS_OPTIONS = [
  { value: "TO_DO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "P1", label: "P1 — High" },
  { value: "P2", label: "P2 — Medium" },
  { value: "P3", label: "P3 — Low" },
  { value: "P4", label: "P4 — Someday" },
] as const;

export function TaskForm({
  open,
  onClose,
  onSubmit,
  initialValues,
  mode = "create",
  presentation = "full",
  timeZone,
  locale,
  projects = [],
  labels = [],
  labelsLoading = false,
  isPending = false,
  error,
  conflictError,
  onReloadLatest,
}: TaskFormProps) {
  const initialKey = JSON.stringify(initialValues ?? null);
  const baseline = useMemo(
    () => createFormState(initialValues, timeZone),
    // initialKey is the stable value snapshot; depending on the object itself would reset typed
    // fields whenever a caller supplied an equivalent inline object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialKey, timeZone],
  );
  const initialHasAdvanced = useMemo(
    () => hasAdvancedValues(initialValues),
    // See baseline above: this reacts to value changes, not equivalent object identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialKey],
  );
  const [form, setForm] = useState<TaskFormState>(baseline);
  const [showAdvanced, setShowAdvanced] = useState(
    () => mode === "edit" || presentation === "full" || hasAdvancedValues(initialValues),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [labelQuery, setLabelQuery] = useState("");
  const pendingSummaryFocus = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Opening with a different record starts a fresh editing session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(baseline);
    setShowAdvanced(mode === "edit" || presentation === "full" || initialHasAdvanced);
    setFieldErrors({});
    setLabelQuery("");
    pendingSummaryFocus.current = false;
  }, [baseline, initialHasAdvanced, mode, open, presentation]);

  const summaryRef: RefCallback<HTMLDivElement> = (node) => {
    if (node !== null && pendingSummaryFocus.current) {
      pendingSummaryFocus.current = false;
      node.focus();
    }
  };

  const isDirty = open && !sameFormState(form, baseline);
  const terminal = form.status === "DONE" || form.status === "CANCELLED";
  const controlsDisabled = isPending || Boolean(conflictError);
  const projectOptions = useMemo<readonly ComboboxOption[]>(
    () =>
      projects.map(({ id, name, disabled }) => ({
        value: id,
        label: name,
        ...(disabled === undefined ? {} : { disabled }),
      })),
    [projects],
  );
  const labelOptions = useMemo<readonly ComboboxOption[]>(
    () =>
      labels.map(({ id, name, disabled }) => ({
        value: id,
        label: name,
        ...(disabled === undefined ? {} : { disabled }),
      })),
    [labels],
  );

  function updateForm(patch: Partial<TaskFormState>, clearError?: keyof FieldErrors) {
    setForm((current) => ({ ...current, ...patch }));
    if (clearError !== undefined && fieldErrors[clearError] !== undefined) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[clearError];
        return next;
      });
    }
  }

  function handleSubmit() {
    if (conflictError) return;

    const errors = validateForm(form, timeZone);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      pendingSummaryFocus.current = true;
      return;
    }

    const resolution =
      form.due.date !== null && form.due.time !== null
        ? resolveLocalDateTime(form.due.date, form.due.time, timeZone)
        : null;
    const dueAt =
      resolution !== null && resolution.kind !== "nonexistent"
        ? new Date(resolution.instantMs).toISOString()
        : null;

    onSubmit({
      ...(initialValues?.id === undefined ? {} : { id: initialValues.id }),
      projectId: form.projectId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      dueAt,
      estimateMinutes: form.estimateMinutes,
      progress: form.progress === "" ? 0 : form.progress,
      mitDate: form.isMit && !terminal ? form.mitDate : null,
      labelIds: form.labelIds,
      ...(initialValues?.version === undefined ? {} : { version: initialValues.version }),
    });
  }

  const title =
    presentation === "quick-add" ? "Add task" : mode === "edit" ? "Edit task" : "Create task";
  const submitLabel = mode === "edit" ? "Save task" : "Add task";

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={title}
      {...(presentation === "quick-add"
        ? { description: "Capture the task now. Add more detail here or update it later." }
        : {})}
      submitLabel={submitLabel}
      isDirty={isDirty}
      pending={isPending}
      pendingLabel={mode === "edit" ? "Saving task…" : "Adding task…"}
      submitDisabled={Boolean(conflictError)}
      initialFocusRef={titleInputRef}
      {...(error ? { error } : {})}
      className="lifeos-task-form-dialog"
    >
      <FormFieldGroup>
        <FormErrorSummary ref={summaryRef} />

        {conflictError ? (
          <Alert tone="danger" heading="This task changed elsewhere">
            <p>{conflictError}</p>
            {onReloadLatest ? (
              <Button type="button" variant="secondary" onClick={onReloadLatest}>
                Reload latest task
              </Button>
            ) : null}
          </Alert>
        ) : null}

        <fieldset className="lifeos-task-form__fieldset" disabled={controlsDisabled}>
          <div className="lifeos-task-form">
            <FormField
              name="title"
              label="Task title"
              {...(fieldErrors.title ? { error: fieldErrors.title } : {})}
            >
              {(field) => (
                <TextInput
                  {...field}
                  ref={titleInputRef}
                  required
                  value={form.title}
                  placeholder="Prepare weekly review"
                  onChange={(event) => updateForm({ title: event.target.value }, "title")}
                />
              )}
            </FormField>

            <FormField name="projectId" label="Project" required={false}>
              {(field) => (
                <Select
                  {...field}
                  value={form.projectId ?? ""}
                  placeholder="No project"
                  options={projectOptions}
                  onChange={(event) =>
                    updateForm({ projectId: event.target.value === "" ? null : event.target.value })
                  }
                />
              )}
            </FormField>

            <FormField
              name="dueAt"
              label="Due date"
              required={false}
              {...(fieldErrors.dueAt ? { error: fieldErrors.dueAt } : {})}
            >
              {(field) => (
                <DateTimeField
                  id={field.id}
                  legend={field.label}
                  description={`Shown in your current timezone: ${timeZone}.`}
                  value={form.due}
                  timeZone={timeZone}
                  {...(field.error ? { error: field.error } : {})}
                  onValueChange={(due) => updateForm({ due }, "dueAt")}
                />
              )}
            </FormField>

            {presentation === "quick-add" && !showAdvanced ? (
              <Button
                type="button"
                variant="ghost"
                className="lifeos-task-form__advanced-toggle"
                onClick={() => setShowAdvanced(true)}
              >
                Show all task options
              </Button>
            ) : null}

            {showAdvanced ? (
              <div className="lifeos-task-form__advanced">
                <FormField name="description" label="Description" required={false}>
                  {(field) => (
                    <Textarea
                      {...field}
                      value={form.description}
                      rows={4}
                      placeholder="Add context or a clear definition of done"
                      onChange={(event) => updateForm({ description: event.target.value })}
                    />
                  )}
                </FormField>

                <div className="lifeos-task-form__grid">
                  <FormField name="status" label="Status">
                    {(field) => (
                      <Select
                        {...field}
                        value={form.status}
                        options={STATUS_OPTIONS}
                        onChange={(event) =>
                          updateForm({ status: event.target.value as TaskStatus })
                        }
                      />
                    )}
                  </FormField>

                  <FormField name="priority" label="Priority">
                    {(field) => (
                      <Select
                        {...field}
                        value={form.priority}
                        options={PRIORITY_OPTIONS}
                        onChange={(event) =>
                          updateForm({ priority: event.target.value as TaskPriority })
                        }
                      />
                    )}
                  </FormField>
                </div>

                <div className="lifeos-task-form__grid">
                  <FormField
                    name="estimateMinutes"
                    label="Estimate"
                    required={false}
                    {...(fieldErrors.estimateMinutes ? { error: fieldErrors.estimateMinutes } : {})}
                  >
                    {(field) => (
                      <DurationField
                        id={field.id}
                        legend={field.label}
                        description="Your expected effort. You can update it later."
                        value={form.estimateMinutes}
                        locale={locale}
                        min={0}
                        {...(field.error ? { error: field.error } : {})}
                        onValueChange={(estimateMinutes) =>
                          updateForm({ estimateMinutes }, "estimateMinutes")
                        }
                      />
                    )}
                  </FormField>

                  <FormField
                    name="progress"
                    label="Progress"
                    description="A whole number from 0 to 100."
                    {...(fieldErrors.progress ? { error: fieldErrors.progress } : {})}
                  >
                    {(field) => (
                      <NumberInput
                        {...field}
                        value={form.progress}
                        min={0}
                        max={100}
                        unit="percent"
                        onChange={(event) =>
                          updateForm(
                            {
                              progress: event.target.value === "" ? "" : Number(event.target.value),
                            },
                            "progress",
                          )
                        }
                      />
                    )}
                  </FormField>
                </div>

                <Combobox
                  multiple
                  label="Labels (optional)"
                  description="Choose the labels that apply to this task."
                  options={labelOptions}
                  value={form.labelIds}
                  query={labelQuery}
                  onQueryChange={setLabelQuery}
                  onValueChange={(labelIds) => updateForm({ labelIds })}
                  loading={labelsLoading}
                  loadingLabel="Loading labels…"
                  noResultsMessage="No matching labels."
                />

                <Checkbox
                  label={mitLabel(form.mitDate, initialValues?.mitDate ?? null, locale)}
                  description={
                    terminal
                      ? "Done and cancelled tasks cannot be a Most Important Task."
                      : "Only one task can hold this date. Choosing this task replaces the current one."
                  }
                  checked={form.isMit && !terminal}
                  disabled={terminal}
                  onChange={(event) => updateForm({ isMit: event.target.checked })}
                />
              </div>
            ) : null}
          </div>
        </fieldset>
      </FormFieldGroup>
    </FormDialog>
  );
}

function createFormState(
  initial: Partial<TaskFormData> | null | undefined,
  timeZone: string,
): TaskFormState {
  const today = todayLocalDate(timeZone);
  return {
    title: initial?.title ?? "",
    projectId: initial?.projectId ?? null,
    description: initial?.description ?? "",
    status: initial?.status ?? "TO_DO",
    priority: initial?.priority ?? "P2",
    due: dueAtToDateTimeValue(initial?.dueAt ?? null, timeZone),
    estimateMinutes: initial?.estimateMinutes ?? null,
    progress: initial?.progress ?? 0,
    labelIds: initial?.labelIds ?? [],
    isMit: initial?.mitDate != null,
    mitDate: initial?.mitDate ?? today,
  };
}

function hasAdvancedValues(initial: Partial<TaskFormData> | null | undefined): boolean {
  return Boolean(
    initial?.description ||
    (initial?.status && initial.status !== "TO_DO") ||
    (initial?.priority && initial.priority !== "P2") ||
    initial?.estimateMinutes != null ||
    (initial?.progress != null && initial.progress !== 0) ||
    (initial?.labelIds && initial.labelIds.length > 0) ||
    initial?.mitDate,
  );
}

function validateForm(form: TaskFormState, timeZone: string): FieldErrors {
  const errors: FieldErrors = {};
  if (form.title.trim() === "") errors.title = "Enter a task title.";

  const hasDueDate = form.due.date !== null;
  const hasDueTime = form.due.time !== null;
  if (hasDueDate !== hasDueTime) {
    errors.dueAt = "Choose both a due date and time, or clear both.";
  } else if (form.due.date !== null && form.due.time !== null) {
    if (resolveLocalDateTime(form.due.date, form.due.time, timeZone).kind === "nonexistent") {
      errors.dueAt = `This time does not exist in ${timeZone} because of a daylight saving change. Choose a different time.`;
    }
  }

  if (form.estimateMinutes !== null && form.estimateMinutes < 0) {
    errors.estimateMinutes = "Enter an estimate of 0 minutes or more.";
  }
  if (
    form.progress === "" ||
    !Number.isInteger(form.progress) ||
    form.progress < 0 ||
    form.progress > 100
  ) {
    errors.progress = "Enter progress as a whole number from 0 to 100.";
  }
  return errors;
}

function dueAtToDateTimeValue(dueAt: string | null, timeZone: string): DateTimeValue {
  if (dueAt === null) return { date: null, time: null };
  const date = new Date(dueAt);
  if (Number.isNaN(date.valueOf())) return { date: null, time: null };
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}` as LocalDate,
    time: `${part("hour")}:${part("minute")}` as LocalTime,
  };
}

function sameFormState(left: TaskFormState, right: TaskFormState): boolean {
  return (
    left.title === right.title &&
    left.projectId === right.projectId &&
    left.description === right.description &&
    left.status === right.status &&
    left.priority === right.priority &&
    left.due.date === right.due.date &&
    left.due.time === right.due.time &&
    left.estimateMinutes === right.estimateMinutes &&
    left.progress === right.progress &&
    left.isMit === right.isMit &&
    left.mitDate === right.mitDate &&
    left.labelIds.length === right.labelIds.length &&
    left.labelIds.every((value, index) => value === right.labelIds[index])
  );
}

function mitLabel(date: LocalDate, initialDate: LocalDate | null, locale: string): string {
  const readableDate = formatLocalDate(date, locale, { day: "numeric", month: "short" });
  return initialDate === null
    ? `Make this the Most Important Task (MIT) for ${readableDate}`
    : `Keep this as the Most Important Task (MIT) for ${readableDate}`;
}
