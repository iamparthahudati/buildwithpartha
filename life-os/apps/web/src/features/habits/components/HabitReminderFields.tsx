import { Checkbox, TimeInput } from "@components/ui";
import type { LocalTime } from "@lib/localDateTime";

import "./habit-reminder-fields.css";

export interface HabitReminderFieldsProps {
  readonly enabled: boolean;
  readonly time: LocalTime | "";
  readonly onEnabledChange: (enabled: boolean) => void;
  readonly onTimeChange: (time: LocalTime) => void;
  readonly disabled?: boolean;
  readonly timeError?: string;
  readonly className?: string;
}

export function HabitReminderFields({
  enabled,
  time,
  onEnabledChange,
  onTimeChange,
  disabled = false,
  timeError,
  className,
}: HabitReminderFieldsProps) {
  return (
    <fieldset
      className={["habit-reminder-fields", className].filter(Boolean).join(" ")}
      disabled={disabled}
    >
      <legend>Reminder</legend>
      <Checkbox
        label="Enable a LifeOS reminder"
        description="This setting does not enable email or browser notifications by itself."
        checked={enabled}
        onChange={(event) => onEnabledChange(event.target.checked)}
      />
      {enabled ? (
        <TimeInput
          label="Reminder time"
          description="Interpreted in the Habit's timezone."
          value={time}
          required
          {...(timeError ? { error: timeError } : {})}
          onChange={(event) => onTimeChange(event.target.value)}
        />
      ) : null}
    </fieldset>
  );
}
