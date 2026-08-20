import { useState, useEffect, useRef } from "react";
import { TextInput, Textarea, Select, Button, DateInput } from "@components/ui";
import {
  FormFieldGroup,
  FormField,
  FormErrorSummary,
  ColorIconPicker,
  DurationField,
  Combobox,
  type ColorSwatchName,
  type IconOptionName,
  type ComboboxOption,
} from "@components/forms";
import { FormDialog, Alert } from "@components/feedback";
import type { ProjectStatus, ProjectPriority, ProjectHealth } from "../model/project";
import "./project-form.css";

export interface ProjectFormData {
  readonly id?: string;
  readonly name: string;
  readonly description?: string | null;
  readonly status: ProjectStatus;
  readonly priority: ProjectPriority;
  readonly health: ProjectHealth;
  readonly color?: ColorSwatchName | null;
  readonly icon?: IconOptionName | null;
  readonly startDate?: string | null;
  readonly deadlineDate?: string | null;
  readonly estimatedMinutes?: number | null;
  readonly labels?: readonly string[];
  readonly version?: number;
}

export interface ProjectFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: ProjectFormData) => Promise<void> | void;
  readonly initialValues?: Partial<ProjectFormData> | null;
  readonly mode?: "create" | "edit";
  readonly isPending?: boolean;
  readonly error?: string;
  readonly conflictError?: string;
  readonly onResolveConflict?: () => void;
  readonly availableLabels?: readonly string[];
}

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "P1", label: "P1 - Critical" },
  { value: "P2", label: "P2 - High" },
  { value: "P3", label: "P3 - Medium" },
  { value: "P4", label: "P4 - Low" },
];

const HEALTH_OPTIONS = [
  { value: "NOT_SET", label: "Not Set" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "AT_RISK", label: "At Risk" },
  { value: "OFF_TRACK", label: "Off Track" },
];

const DEFAULT_LABELS: readonly string[] = [
  "Frontend",
  "Backend",
  "Design",
  "DevOps",
  "Infrastructure",
];

function hasAdvancedValues(initial: Partial<ProjectFormData> | null | undefined): boolean {
  if (!initial) return false;
  return Boolean(
    (initial.health && initial.health !== "NOT_SET") ||
    initial.startDate ||
    initial.deadlineDate ||
    (initial.estimatedMinutes !== undefined && initial.estimatedMinutes !== null) ||
    (initial.color && initial.color !== "blue") ||
    (initial.icon && initial.icon !== "folder") ||
    (initial.labels && initial.labels.length > 0),
  );
}

export function ProjectForm({
  open,
  onClose,
  onSubmit,
  initialValues,
  mode = "create",
  isPending = false,
  error,
  conflictError,
  onResolveConflict,
  availableLabels = DEFAULT_LABELS,
}: ProjectFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(initialValues?.status ?? "ACTIVE");
  const [priority, setPriority] = useState<ProjectPriority>(initialValues?.priority ?? "P3");
  const [health, setHealth] = useState<ProjectHealth>(initialValues?.health ?? "NOT_SET");
  const [color, setColor] = useState<ColorSwatchName | null>(initialValues?.color ?? "blue");
  const [icon, setIcon] = useState<IconOptionName | null>(initialValues?.icon ?? "folder");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [deadlineDate, setDeadlineDate] = useState(initialValues?.deadlineDate ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(
    initialValues?.estimatedMinutes ?? null,
  );
  const [selectedLabels, setSelectedLabels] = useState<readonly string[]>(
    initialValues?.labels ?? [],
  );
  const [labelQuery, setLabelQuery] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(
    () => mode === "edit" || hasAdvancedValues(initialValues),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Sync state when initialValues change or dialog opens
  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setDescription(initialValues?.description ?? "");
      setStatus(initialValues?.status ?? "ACTIVE");
      setPriority(initialValues?.priority ?? "P3");
      setHealth(initialValues?.health ?? "NOT_SET");
      setColor(initialValues?.color ?? "blue");
      setIcon(initialValues?.icon ?? "folder");
      setStartDate(initialValues?.startDate ?? "");
      setDeadlineDate(initialValues?.deadlineDate ?? "");
      setEstimatedMinutes(initialValues?.estimatedMinutes ?? null);
      setSelectedLabels(initialValues?.labels ?? []);
      setShowAdvanced(mode === "edit" || hasAdvancedValues(initialValues));
      setFieldErrors({});
    }
  }, [open, initialValues, mode]);

  const isDirty =
    name !== (initialValues?.name ?? "") ||
    description !== (initialValues?.description ?? "") ||
    status !== (initialValues?.status ?? "ACTIVE") ||
    priority !== (initialValues?.priority ?? "P3") ||
    health !== (initialValues?.health ?? "NOT_SET") ||
    color !== (initialValues?.color ?? "blue") ||
    icon !== (initialValues?.icon ?? "folder") ||
    startDate !== (initialValues?.startDate ?? "") ||
    deadlineDate !== (initialValues?.deadlineDate ?? "") ||
    estimatedMinutes !== (initialValues?.estimatedMinutes ?? null) ||
    JSON.stringify(selectedLabels) !== JSON.stringify(initialValues?.labels ?? []);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Enter a project name.";
    }
    if (startDate && deadlineDate && deadlineDate < startDate) {
      errors.deadlineDate = "Deadline cannot be before start date.";
    }
    return errors;
  }

  function handleSubmit() {
    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      errorSummaryRef.current?.focus();
      return;
    }

    const payload: ProjectFormData = {
      ...(initialValues?.id ? { id: initialValues.id } : {}),
      ...(initialValues?.version !== undefined ? { version: initialValues.version } : {}),
      name: name.trim(),
      description: description.trim() || null,
      status,
      priority,
      health,
      color,
      icon,
      startDate: startDate || null,
      deadlineDate: deadlineDate || null,
      estimatedMinutes,
      labels: selectedLabels,
    };

    onSubmit(payload);
  }

  const comboboxOptions: ComboboxOption[] = availableLabels.map((l) => ({
    value: l,
    label: l,
  }));

  const dialogTitle = mode === "edit" ? "Edit project" : "Create project";
  const submitLabel = mode === "edit" ? "Save changes" : "Create project";

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={dialogTitle}
      submitLabel={submitLabel}
      isDirty={isDirty}
      pending={isPending}
      error={error}
      className="lifeos-project-form-dialog"
    >
      <FormFieldGroup>
        <FormErrorSummary ref={errorSummaryRef} title="Fix the following errors before saving" />

        {conflictError ? (
          <Alert tone="danger" title="Version Conflict">
            <p>{conflictError}</p>
            {onResolveConflict ? (
              <Button type="button" variant="secondary" onClick={onResolveConflict}>
                Reload latest data
              </Button>
            ) : null}
          </Alert>
        ) : null}

        <div className="lifeos-project-form">
          <FormField name="name" label="Project name" error={fieldErrors.name}>
            {(fieldProps) => (
              <TextInput
                {...fieldProps}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Redesign"
                autoFocus
              />
            )}
          </FormField>

          <FormField
            name="description"
            label="Description"
            required={false}
            error={fieldErrors.description}
          >
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the project goals and scope..."
                rows={3}
              />
            )}
          </FormField>

          <div className="lifeos-project-form__grid">
            <FormField name="status" label="Status" error={fieldErrors.status}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  options={STATUS_OPTIONS}
                />
              )}
            </FormField>

            <FormField name="priority" label="Priority" error={fieldErrors.priority}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                  options={PRIORITY_OPTIONS}
                />
              )}
            </FormField>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="lifeos-project-form__progressive-toggle"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? "Hide advanced options" : "Show advanced options"}
          </Button>

          {showAdvanced ? (
            <div className="lifeos-project-form__advanced">
              <FormField name="health" label="Health" error={fieldErrors.health}>
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={health}
                    onChange={(e) => setHealth(e.target.value as ProjectHealth)}
                    options={HEALTH_OPTIONS}
                  />
                )}
              </FormField>

              <ColorIconPicker
                legend="Project Theme & Icon"
                value={{ color, icon }}
                onValueChange={(val) => {
                  setColor(val.color);
                  setIcon(val.icon);
                }}
              />

              <div className="lifeos-project-form__grid">
                <FormField
                  name="startDate"
                  label="Start date"
                  required={false}
                  error={fieldErrors.startDate}
                >
                  {(fieldProps) => (
                    <DateInput
                      {...fieldProps}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  )}
                </FormField>

                <FormField
                  name="deadlineDate"
                  label="Deadline date"
                  required={false}
                  error={fieldErrors.deadlineDate}
                >
                  {(fieldProps) => (
                    <DateInput
                      {...fieldProps}
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                    />
                  )}
                </FormField>
              </div>

              <DurationField
                legend="Estimated time"
                description="Total estimated time for this project"
                value={estimatedMinutes}
                onValueChange={setEstimatedMinutes}
                locale="en-US"
              />

              <FormField name="labels" label="Labels" required={false} error={fieldErrors.labels}>
                {() => (
                  <Combobox
                    multiple
                    label="Labels"
                    options={comboboxOptions}
                    value={selectedLabels}
                    onValueChange={setSelectedLabels}
                    query={labelQuery}
                    onQueryChange={setLabelQuery}
                  />
                )}
              </FormField>
            </div>
          ) : null}
        </div>
      </FormFieldGroup>
    </FormDialog>
  );
}
