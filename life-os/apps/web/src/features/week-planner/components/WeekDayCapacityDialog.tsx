import { useState } from "react";
import { NumberInput, Text } from "@components/ui";
import { FormField } from "@components/forms";
import { FormDialog } from "@components/feedback";
import { formatLocalDate } from "@lib/localDateTime";
import { formatMinutesToHours, type WeekDayPlan } from "../model/weekPlanner";
import "./week-day-capacity-dialog.css";

export interface WeekDayCapacityDialogProps {
  readonly open: boolean;
  readonly day?: WeekDayPlan | null;
  readonly onClose: () => void;
  readonly onSubmit: (dayLocalDate: string, availableMinutes: number) => Promise<void> | void;
  readonly isPending?: boolean;
  readonly error?: string;
  readonly locale?: string;
}

export function WeekDayCapacityDialog({
  open,
  day,
  onClose,
  onSubmit,
  isPending = false,
  error,
  locale = "en-US",
}: WeekDayCapacityDialogProps) {
  const currentKey = day ? `${day.localDate}-${open}` : "";
  const [prevKey, setPrevKey] = useState(currentKey);
  const [hours, setHours] = useState<number | undefined>(
    day ? Math.round((day.availableMinutes / 60) * 10) / 10 : 8,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setHours(day ? Math.round((day.availableMinutes / 60) * 10) / 10 : 8);
    setValidationError(null);
  }

  const fullDateLabel = day ? formatLocalDate(day.localDate, locale, { dateStyle: "full" }) : "Day";

  const availableMinutes = hours !== undefined ? Math.round(hours * 60) : 0;
  const plannedMinutes = day?.plannedMinutes ?? 0;
  const isOvercapacity = availableMinutes > 0 && plannedMinutes > availableMinutes;
  const deltaMinutes = Math.abs(plannedMinutes - availableMinutes);

  const handleSubmit = () => {
    if (!day) return;

    if (hours === undefined || isNaN(hours) || hours < 0) {
      setValidationError("Available capacity hours must be 0 or greater.");
      return;
    }

    if (hours > 24) {
      setValidationError("Available capacity hours cannot exceed 24 hours per day.");
      return;
    }

    setValidationError(null);
    void onSubmit(day.localDate, availableMinutes);
  };

  const combinedError = error ?? validationError ?? undefined;

  return (
    <FormDialog
      open={open}
      title={`Adjust Capacity for ${fullDateLabel}`}
      description="Set the target available focus time capacity for this day."
      submitLabel="Save capacity"
      cancelLabel="Cancel"
      onClose={onClose}
      onSubmit={handleSubmit}
      {...(isPending ? { pending: isPending } : {})}
      {...(combinedError ? { error: combinedError } : {})}
      className="lifeos-week-day-capacity-dialog"
    >
      <FormField
        name="availableHours"
        label="Available Capacity (Hours)"
        description="Available working or focus hours allocated for this day (0 to 24 hours)."
        {...(validationError ? { error: validationError } : {})}
      >
        {(fieldProps) => (
          <NumberInput
            {...fieldProps}
            label="Available Capacity (Hours)"
            labelHidden
            value={hours ?? ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setHours(isNaN(val) ? undefined : val);
              setValidationError(null);
            }}
            min={0}
            max={24}
            step={0.5}
            unit="hours"
            disabled={isPending}
          />
        )}
      </FormField>

      <div className="lifeos-week-day-capacity-dialog__impact">
        <Text size="xs" weight="semibold">
          Workload Impact Summary:
        </Text>
        <div className="lifeos-week-day-capacity-dialog__impact-details">
          <Text size="xs" tone="secondary">
            Planned workload:{" "}
            <Text inline numeric weight="semibold">
              {formatMinutesToHours(plannedMinutes)}
            </Text>
          </Text>
          <Text size="xs" tone="secondary">
            New capacity:{" "}
            <Text inline numeric weight="semibold">
              {formatMinutesToHours(availableMinutes)}
            </Text>
          </Text>
          <Text size="xs" tone={isOvercapacity ? "danger" : "success"}>
            {isOvercapacity
              ? `Exceeds capacity by ${formatMinutesToHours(deltaMinutes)}`
              : `Remaining capacity: ${formatMinutesToHours(deltaMinutes)}`}
          </Text>
        </div>
      </div>
    </FormDialog>
  );
}
