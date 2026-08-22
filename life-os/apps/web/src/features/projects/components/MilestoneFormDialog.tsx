import { useState } from "react";
import { TextInput, Select, DateInput } from "@components/ui";
import { FormFieldGroup, FormField, FormErrorSummary } from "@components/forms";
import { FormDialog } from "@components/feedback";
import { compareLocalDates } from "@lib/localDateTime";
import type { Milestone, MilestoneStatus } from "../model/milestone";

export interface MilestoneFormData {
  readonly title: string;
  readonly date?: string | null;
  readonly status: MilestoneStatus;
  readonly ordering?: number;
}

export interface MilestoneFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: MilestoneFormData) => Promise<void> | void;
  readonly initialValues?: Milestone | null;
  readonly mode?: "create" | "edit";
  readonly isPending?: boolean;
  readonly error?: string | null;
  readonly projectStartDate?: string | null;
  readonly projectDeadlineDate?: string | null;
}

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function MilestoneFormDialog({
  open,
  onClose,
  onSubmit,
  initialValues,
  mode = "create",
  isPending = false,
  error,
  projectStartDate,
  projectDeadlineDate,
}: MilestoneFormDialogProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<MilestoneStatus>("PLANNED");
  const [ordering, setOrdering] = useState(0);

  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    date?: string;
    status?: string;
  }>({});

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialValues, setPrevInitialValues] = useState(initialValues);

  if (open !== prevOpen || initialValues !== prevInitialValues) {
    setPrevOpen(open);
    setPrevInitialValues(initialValues);
    if (open) {
      setTitle(initialValues?.title ?? "");
      setDate(initialValues?.date ?? "");
      setStatus(initialValues?.status ?? "PLANNED");
      setOrdering(initialValues?.ordering ?? 0);
      setFieldErrors({});
    }
  }

  const validate = (): boolean => {
    const errors: { title?: string; date?: string; status?: string } = {};

    if (!title.trim()) {
      errors.title = "Milestone title is required.";
    }

    if (date) {
      if (projectStartDate && compareLocalDates(date, projectStartDate) < 0) {
        errors.date = `Milestone date cannot be before project start date (${projectStartDate}).`;
      } else if (projectDeadlineDate && compareLocalDates(date, projectDeadlineDate) > 0) {
        errors.date = `Milestone date cannot be after project deadline (${projectDeadlineDate}).`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = () => {
    if (!validate()) return;

    void onSubmit({
      title: title.trim(),
      date: date.trim() ? date.trim() : null,
      status,
      ordering,
    });
  };

  const dialogTitle = mode === "edit" ? "Edit milestone" : "Add milestone";
  const submitLabel = mode === "edit" ? "Save changes" : "Add milestone";

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={handleFormSubmit}
      title={dialogTitle}
      submitLabel={submitLabel}
      pending={isPending}
      {...(error ? { error } : {})}
    >
      <FormFieldGroup>
        <FormErrorSummary />

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
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors(({ title: _t, ...rest }) => rest);
                }
              }}
              placeholder="e.g. Phase 1 Release"
            />
          )}
        </FormField>

        <FormField
          name="date"
          label="Target Date"
          required={false}
          {...(fieldErrors.date ? { error: fieldErrors.date } : {})}
        >
          {(field) => (
            <DateInput
              {...field}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (fieldErrors.date) {
                  setFieldErrors(({ date: _d, ...rest }) => rest);
                }
              }}
              {...(projectStartDate ? { min: projectStartDate } : {})}
              {...(projectDeadlineDate ? { max: projectDeadlineDate } : {})}
            />
          )}
        </FormField>

        <FormField
          name="status"
          label="Status"
          required
          {...(fieldErrors.status ? { error: fieldErrors.status } : {})}
        >
          {(field) => (
            <Select
              {...field}
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
              options={STATUS_OPTIONS}
            />
          )}
        </FormField>
      </FormFieldGroup>
    </FormDialog>
  );
}
