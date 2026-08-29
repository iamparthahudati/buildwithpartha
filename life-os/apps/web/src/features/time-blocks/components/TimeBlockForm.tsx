import { useState, useRef, type RefCallback } from "react";
import { FormDialog, Alert } from "@components/feedback";
import { FormFieldGroup, FormField, FormErrorSummary } from "@components/forms";
import {
  TextInput,
  Select,
  DateInput,
  TimeInput,
  Textarea,
  Checkbox,
  type SelectOption,
} from "@components/ui";
import {
  todayLocalDate,
  resolveLocalDateTime,
  type LocalDate,
  type LocalTime,
} from "@lib/localDateTime";
import type { TimeBlock, TimeBlockStatus } from "../model/timeBlock";
import "./time-block-form.css";

export interface TimeBlockTaskOption {
  readonly id: string;
  readonly title: string;
  readonly disabled?: boolean;
}

export interface TimeBlockProjectOption {
  readonly id: string;
  readonly name: string;
  readonly disabled?: boolean;
}

export interface TimeBlockCategoryOption {
  readonly value: string;
  readonly label: string;
  readonly color?: string;
  readonly icon?: string;
}

const DEFAULT_CATEGORY_OPTIONS: readonly TimeBlockCategoryOption[] = [
  { value: "Focus", label: "Focus", color: "blue", icon: "target" },
  { value: "Meeting", label: "Meeting", color: "purple", icon: "users" },
  { value: "Planning", label: "Planning", color: "green", icon: "calendar" },
  { value: "Admin", label: "Admin", color: "gray", icon: "file-text" },
  { value: "Personal", label: "Personal", color: "amber", icon: "user" },
  { value: "Health", label: "Health", color: "emerald", icon: "heart" },
  { value: "Leisure", label: "Leisure", color: "indigo", icon: "coffee" },
];

export interface TimeBlockFormData {
  readonly id?: string;
  readonly title: string;
  readonly category: string;
  readonly categoryColor?: string | null;
  readonly categoryIcon?: string | null;
  readonly date: LocalDate;
  readonly startTime: LocalTime;
  readonly endTime: LocalTime;
  readonly timeZone: string;
  readonly status: TimeBlockStatus;
  readonly projectId: string | null;
  readonly taskId: string | null;
  readonly notes: string | null;
  readonly allowOverlap: boolean;
  readonly version?: number;
}

export interface TimeBlockFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: TimeBlockFormData) => Promise<void> | void;
  readonly initialValues?: Partial<TimeBlockFormData> | TimeBlock | null;
  readonly mode?: "create" | "edit";
  readonly isPending?: boolean;
  readonly error?: string;
  readonly conflictError?: string;
  readonly hasConflict?: boolean;
  readonly conflictDescriptions?: readonly string[];
  readonly onResolveConflict?: () => void;
  readonly tasks?: readonly TimeBlockTaskOption[];
  readonly projects?: readonly TimeBlockProjectOption[];
  readonly categories?: readonly TimeBlockCategoryOption[];
  readonly timeZone?: string;
  readonly locale?: string;
}

type FieldErrors = Partial<
  Record<"title" | "category" | "date" | "startTime" | "endTime" | "timeZone", string>
>;

function timeToMinutes(time: LocalTime): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function resolveInitialCategory(
  initialValues: Partial<TimeBlockFormData> | TimeBlock | null | undefined,
): string {
  if (!initialValues) return "Focus";
  if (typeof initialValues.category === "object" && initialValues.category !== null) {
    return initialValues.category.name ?? "Focus";
  }
  if (typeof initialValues.category === "string" && initialValues.category) {
    return initialValues.category;
  }
  return "Focus";
}

function resolveInitialCategoryColor(
  initialValues: Partial<TimeBlockFormData> | TimeBlock | null | undefined,
): string | null {
  if (!initialValues) return null;
  if (typeof initialValues.category === "object" && initialValues.category !== null) {
    return initialValues.category.color ?? initialValues.categoryColor ?? null;
  }
  return initialValues.categoryColor ?? null;
}

function resolveInitialCategoryIcon(
  initialValues: Partial<TimeBlockFormData> | TimeBlock | null | undefined,
): string | null {
  if (!initialValues) return null;
  if (typeof initialValues.category === "object" && initialValues.category !== null) {
    return initialValues.category.icon ?? initialValues.categoryIcon ?? null;
  }
  return initialValues.categoryIcon ?? null;
}

function resolveInitialProjectId(
  initialValues: Partial<TimeBlockFormData> | TimeBlock | null | undefined,
): string | null {
  if (!initialValues) return null;
  if ("projectId" in initialValues && initialValues.projectId) {
    return initialValues.projectId;
  }
  if ("project" in initialValues && initialValues.project?.id) {
    return initialValues.project.id;
  }
  return null;
}

function resolveInitialTaskId(
  initialValues: Partial<TimeBlockFormData> | TimeBlock | null | undefined,
): string | null {
  if (!initialValues) return null;
  if ("taskId" in initialValues && initialValues.taskId) {
    return initialValues.taskId;
  }
  if ("task" in initialValues && initialValues.task?.id) {
    return initialValues.task.id;
  }
  return null;
}

function resolveInitialAllowOverlap(
  initialValues: Partial<TimeBlockFormData> | TimeBlock | null | undefined,
): boolean {
  if (!initialValues) return false;
  if ("allowOverlap" in initialValues && typeof initialValues.allowOverlap === "boolean") {
    return initialValues.allowOverlap;
  }
  return false;
}

export function TimeBlockForm({
  open,
  onClose,
  onSubmit,
  initialValues,
  mode = "create",
  isPending = false,
  error,
  conflictError,
  hasConflict = false,
  conflictDescriptions = [],
  onResolveConflict,
  tasks = [],
  projects = [],
  categories = DEFAULT_CATEGORY_OPTIONS,
  timeZone: defaultTimeZone = "UTC",
}: TimeBlockFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [category, setCategory] = useState(() => resolveInitialCategory(initialValues));
  const [categoryColor, setCategoryColor] = useState<string | null>(() =>
    resolveInitialCategoryColor(initialValues),
  );
  const [categoryIcon, setCategoryIcon] = useState<string | null>(() =>
    resolveInitialCategoryIcon(initialValues),
  );
  const [date, setDate] = useState<LocalDate>(
    initialValues?.date ?? todayLocalDate(defaultTimeZone),
  );
  const [startTime, setStartTime] = useState<LocalTime>(initialValues?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState<LocalTime>(initialValues?.endTime ?? "10:00");
  const [timeZone, setTimeZone] = useState<string>(initialValues?.timeZone ?? defaultTimeZone);
  const [status, setStatus] = useState<TimeBlockStatus>(initialValues?.status ?? "SCHEDULED");
  const [projectId, setProjectId] = useState<string | null>(() =>
    resolveInitialProjectId(initialValues),
  );
  const [taskId, setTaskId] = useState<string | null>(() => resolveInitialTaskId(initialValues));
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [allowOverlap, setAllowOverlap] = useState(() => resolveInitialAllowOverlap(initialValues));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dstWarning, setDstWarning] = useState<string | null>(null);

  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusErrorRef = useRef(false);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);

  if (open !== prevOpen || initialValues !== prevInitialValues) {
    setPrevOpen(open);
    setPrevInitialValues(initialValues);
    if (open) {
      setTitle(initialValues?.title ?? "");
      setCategory(resolveInitialCategory(initialValues));
      setCategoryColor(resolveInitialCategoryColor(initialValues));
      setCategoryIcon(resolveInitialCategoryIcon(initialValues));
      setDate(initialValues?.date ?? todayLocalDate(defaultTimeZone));
      setStartTime(initialValues?.startTime ?? "09:00");
      setEndTime(initialValues?.endTime ?? "10:00");
      setTimeZone(initialValues?.timeZone ?? defaultTimeZone);
      setStatus(initialValues?.status ?? "SCHEDULED");
      setProjectId(resolveInitialProjectId(initialValues));
      setTaskId(resolveInitialTaskId(initialValues));
      setNotes(initialValues?.notes ?? "");
      setAllowOverlap(resolveInitialAllowOverlap(initialValues));
      setFieldErrors({});
      setDstWarning(null);
    }
  }

  const isDirty = Boolean(
    title.trim() !== (initialValues?.title ?? "") ||
    category !== resolveInitialCategory(initialValues) ||
    date !== (initialValues?.date ?? todayLocalDate(defaultTimeZone)) ||
    startTime !== (initialValues?.startTime ?? "09:00") ||
    endTime !== (initialValues?.endTime ?? "10:00") ||
    projectId !== resolveInitialProjectId(initialValues) ||
    taskId !== resolveInitialTaskId(initialValues) ||
    notes.trim() !== (initialValues?.notes ?? "") ||
    allowOverlap !== resolveInitialAllowOverlap(initialValues),
  );

  const summaryRefCallback: RefCallback<HTMLDivElement> = (node) => {
    errorSummaryRef.current = node;
    if (node && pendingFocusErrorRef.current) {
      pendingFocusErrorRef.current = false;
      node.focus();
    }
  };

  function validate(): boolean {
    const errors: FieldErrors = {};
    let dstWarn: string | null = null;

    if (!title.trim()) {
      errors.title = "Title is required.";
    }

    if (!date) {
      errors.date = "Date is required.";
    }

    if (!startTime) {
      errors.startTime = "Start time is required.";
    }

    if (!endTime) {
      errors.endTime = "End time is required.";
    }

    if (startTime && endTime) {
      const startMin = timeToMinutes(startTime);
      const endMin = timeToMinutes(endTime);
      if (startMin >= endMin) {
        errors.endTime = "End time must be after start time.";
      }
    }

    if (date && startTime) {
      const startDst = resolveLocalDateTime(date, startTime, timeZone);
      if (startDst.kind === "nonexistent") {
        errors.startTime = "Invalid local time during daylight saving transition.";
      } else if (startDst.kind === "ambiguous") {
        dstWarn =
          "Start time occurs twice during daylight saving transition. The earlier time will be used.";
      }
    }

    if (date && endTime && !errors.endTime) {
      const endDst = resolveLocalDateTime(date, endTime, timeZone);
      if (endDst.kind === "nonexistent") {
        errors.endTime = "Invalid local time during daylight saving transition.";
      } else if (endDst.kind === "ambiguous" && !dstWarn) {
        dstWarn =
          "End time occurs twice during daylight saving transition. The earlier time will be used.";
      }
    }

    setFieldErrors(errors);
    setDstWarning(dstWarn);

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      pendingFocusErrorRef.current = true;
      if (errorSummaryRef.current) {
        pendingFocusErrorRef.current = false;
        errorSummaryRef.current.focus();
      }
      return false;
    }

    return true;
  }

  function handleSubmit() {
    if (!validate()) {
      return;
    }

    const matchedCategory = categories.find((c) => c.value === category);
    const finalColor = categoryColor ?? matchedCategory?.color ?? null;
    const finalIcon = categoryIcon ?? matchedCategory?.icon ?? null;

    const initialVersion =
      initialValues && "version" in initialValues && typeof initialValues.version === "number"
        ? initialValues.version
        : undefined;

    const payload: TimeBlockFormData = {
      ...(initialValues?.id ? { id: initialValues.id } : {}),
      title: title.trim(),
      category,
      categoryColor: finalColor,
      categoryIcon: finalIcon,
      date,
      startTime,
      endTime,
      timeZone,
      status,
      projectId: projectId || null,
      taskId: taskId || null,
      notes: notes.trim() || null,
      allowOverlap,
      ...(initialVersion !== undefined ? { version: initialVersion } : {}),
    };

    onSubmit(payload);
  }

  const categorySelectOptions: SelectOption[] = categories.map((c) => ({
    value: c.value,
    label: c.label,
  }));

  const projectSelectOptions: SelectOption[] = [
    { value: "", label: "None (Unassigned)" },
    ...projects.map((p) => ({
      value: p.id,
      label: p.name,
      ...(p.disabled ? { disabled: true } : {}),
    })),
  ];

  const taskSelectOptions: SelectOption[] = [
    { value: "", label: "None (Unassigned)" },
    ...tasks.map((t) => ({
      value: t.id,
      label: t.title,
      ...(t.disabled ? { disabled: true } : {}),
    })),
  ];

  const STATUS_OPTIONS: SelectOption[] = [
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const activeConflict = conflictError || hasConflict;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={mode === "edit" ? "Edit time block" : "Create time block"}
      description={
        mode === "edit"
          ? "Update details, timing, or context for this time block."
          : "Schedule a new time block on your calendar."
      }
      submitLabel={mode === "edit" ? "Save changes" : "Create time block"}
      isDirty={isDirty}
      pending={isPending}
      {...(error ? { error } : {})}
      className="time-block-form-dialog"
    >
      <FormFieldGroup>
        <div className="time-block-form-fields">
          {Object.keys(fieldErrors).length > 0 && <FormErrorSummary ref={summaryRefCallback} />}

          {activeConflict && (
            <Alert tone="warning" heading="Scheduling Conflict Detected">
              <p>{conflictError || "This time block overlaps with another scheduled block."}</p>
              {conflictDescriptions.length > 0 && (
                <ul className="time-block-form-conflict-list">
                  {conflictDescriptions.map((desc, idx) => (
                    <li key={idx}>{desc}</li>
                  ))}
                </ul>
              )}
              <div className="time-block-form-overlap-toggle">
                <Checkbox
                  id="time-block-allow-overlap"
                  label="Allow scheduling despite conflict"
                  checked={allowOverlap}
                  onChange={(e) => {
                    setAllowOverlap(e.target.checked);
                    if (onResolveConflict) {
                      onResolveConflict();
                    }
                  }}
                />
              </div>
            </Alert>
          )}

          {dstWarning && !activeConflict && (
            <Alert tone="info" heading="Daylight Saving Transition Warning">
              <p>{dstWarning}</p>
            </Alert>
          )}

          <FormField
            name="title"
            label="Title"
            required
            {...(fieldErrors.title ? { error: fieldErrors.title } : {})}
          >
            {(field) => (
              <TextInput
                {...field}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep Work on API Specs"
              />
            )}
          </FormField>

          <div className="time-block-form-row">
            <FormField
              name="category"
              label="Category"
              required
              {...(fieldErrors.category ? { error: fieldErrors.category } : {})}
            >
              {(field) => (
                <Select
                  {...field}
                  options={categorySelectOptions}
                  value={category}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategory(val);
                    const matched = categories.find((c) => c.value === val);
                    if (matched) {
                      setCategoryColor(matched.color ?? null);
                      setCategoryIcon(matched.icon ?? null);
                    }
                  }}
                />
              )}
            </FormField>

            <FormField name="status" label="Status">
              {(field) => (
                <Select
                  {...field}
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TimeBlockStatus)}
                />
              )}
            </FormField>
          </div>

          <FormField
            name="date"
            label="Date"
            required
            {...(fieldErrors.date ? { error: fieldErrors.date } : {})}
          >
            {(field) => (
              <DateInput
                {...field}
                value={date}
                onChange={(e) => setDate(e.target.value as LocalDate)}
              />
            )}
          </FormField>

          <div className="time-block-form-row">
            <FormField
              name="startTime"
              label="Start time"
              required
              {...(fieldErrors.startTime ? { error: fieldErrors.startTime } : {})}
            >
              {(field) => (
                <TimeInput
                  {...field}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value as LocalTime)}
                />
              )}
            </FormField>

            <FormField
              name="endTime"
              label="End time"
              required
              {...(fieldErrors.endTime ? { error: fieldErrors.endTime } : {})}
            >
              {(field) => (
                <TimeInput
                  {...field}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value as LocalTime)}
                />
              )}
            </FormField>
          </div>

          <div className="time-block-form-row">
            <FormField name="projectId" label="Linked Project" required={false}>
              {(field) => (
                <Select
                  {...field}
                  options={projectSelectOptions}
                  value={projectId ?? ""}
                  onChange={(e) => setProjectId(e.target.value || null)}
                />
              )}
            </FormField>

            <FormField name="taskId" label="Linked Task" required={false}>
              {(field) => (
                <Select
                  {...field}
                  options={taskSelectOptions}
                  value={taskId ?? ""}
                  onChange={(e) => setTaskId(e.target.value || null)}
                />
              )}
            </FormField>
          </div>

          <FormField
            name="timeZone"
            label="Timezone"
            required={false}
            description="Standard IANA timezone name (e.g. UTC, Asia/Kolkata, America/New_York)."
            {...(fieldErrors.timeZone ? { error: fieldErrors.timeZone } : {})}
          >
            {(field) => (
              <TextInput
                {...field}
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
              />
            )}
          </FormField>

          <FormField
            name="notes"
            label="Notes / Repeat schedule note"
            required={false}
            description="Optional notes or recurrence rules for this block."
          >
            {(field) => (
              <Textarea
                {...field}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Weekly planning review notes or prep items..."
              />
            )}
          </FormField>
        </div>
      </FormFieldGroup>
    </FormDialog>
  );
}
