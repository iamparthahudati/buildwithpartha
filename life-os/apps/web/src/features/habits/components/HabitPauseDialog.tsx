import { useEffect, useRef, useState } from "react";

import { FormDialog } from "@components/feedback";
import { FormErrorSummary, FormField, FormFieldGroup } from "@components/forms";
import { DateInput, TextInput } from "@components/ui";
import { compareLocalDates, type LocalDate } from "@lib/localDateTime";

import type { Habit } from "../model/habit";

export interface HabitPauseValues {
  readonly startDate: LocalDate;
  readonly endDate?: LocalDate | null;
  readonly reason?: string | null;
}

export interface HabitPauseDialogProps {
  readonly open: boolean;
  readonly habit: Habit;
  readonly defaultStartDate: LocalDate;
  readonly pending?: boolean;
  readonly error?: string;
  readonly onClose: () => void;
  readonly onSubmit: (values: HabitPauseValues) => void;
}

export function HabitPauseDialog({
  open,
  habit,
  defaultStartDate,
  pending = false,
  error,
  onClose,
  onSubmit,
}: HabitPauseDialogProps) {
  const [startDate, setStartDate] = useState<LocalDate>(defaultStartDate);
  const [endDate, setEndDate] = useState<LocalDate | "">("");
  const [reason, setReason] = useState("");
  const [startError, setStartError] = useState<string>();
  const [endError, setEndError] = useState<string>();
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Resetting a controlled form when a dialog opens is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartDate(defaultStartDate);
    setEndDate("");
    setReason("");
    setStartError(undefined);
    setEndError(undefined);
  }, [defaultStartDate, open]);

  function submit() {
    const nextStartError = startDate ? undefined : "Choose the first paused date.";
    const nextEndError =
      endDate && compareLocalDates(endDate, startDate) < 0
        ? "Choose an end date on or after the start date."
        : undefined;
    setStartError(nextStartError);
    setEndError(nextEndError);
    if (nextStartError || nextEndError) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    onSubmit({
      startDate,
      endDate: endDate || null,
      reason: reason.trim() || null,
    });
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={submit}
      title={`Pause “${habit.name}”`}
      description="Entry expectations are suspended for the selected local dates. Existing history remains available."
      submitLabel="Pause Habit"
      pending={pending}
      pendingLabel="Pausing Habit…"
      isDirty={startDate !== defaultStartDate || Boolean(endDate) || Boolean(reason)}
      {...(error ? { error } : {})}
    >
      <FormFieldGroup>
        {startError || endError ? <FormErrorSummary ref={summaryRef} /> : null}
        <FormField
          name="startDate"
          label="Start date"
          {...(startError ? { error: startError } : {})}
        >
          {(field) => (
            <DateInput
              {...field}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          name="endDate"
          label="End date"
          required={false}
          description="Leave empty to pause until you resume the Habit."
          {...(endError ? { error: endError } : {})}
        >
          {(field) => (
            <DateInput
              {...field}
              value={endDate}
              onClear={() => setEndDate("")}
              onChange={(event) => setEndDate(event.target.value)}
            />
          )}
        </FormField>
        <FormField name="reason" label="Reason" required={false}>
          {(field) => (
            <TextInput
              {...field}
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
        </FormField>
      </FormFieldGroup>
    </FormDialog>
  );
}
