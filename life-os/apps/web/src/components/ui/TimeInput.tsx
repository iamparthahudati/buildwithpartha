import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { X } from "lucide-react";

import type { LocalTime } from "@lib/localDateTime";

import { Field } from "./Field";
import { IconButton } from "./IconButton";
import { fieldIds } from "./fieldIds";
import "./date-time-input.css";

/**
 * TimeInput (LOS-0319).
 *
 * The value is always canonical 24-hour `HH:mm`, whatever the user sees.
 * `type="time"` renders a 12- or 24-hour field according to the platform's own
 * locale setting while exchanging the same string either way, so the display
 * can be as local as the user likes without the stored value ever becoming
 * ambiguous.
 *
 * A time on its own carries no date and no zone. Pair it with a `DateInput` and
 * the user's IANA timezone at the point where an instant is actually needed.
 */

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "children" | "size" | "type" | "prefix" | "value" | "defaultValue" | "min" | "max"
>;

export interface TimeInputProps extends NativeProps {
  readonly label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  /** A wall-clock time, `HH:mm` in 24-hour form. */
  readonly value?: LocalTime;
  readonly defaultValue?: LocalTime;
  readonly min?: LocalTime;
  readonly max?: LocalTime;
  /**
   * Granularity in seconds. The default is 5 minutes: LifeOS schedules Time
   * Blocks and Focus Sessions, and a seconds field on a planning form is noise
   * the user has to tab through.
   */
  readonly step?: number;
  readonly onClear?: () => void;
  readonly clearLabel?: string;
  readonly className?: string;
}

const FIVE_MINUTES_IN_SECONDS = 300;

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  {
    label,
    labelHidden = false,
    description,
    error,
    value,
    step = FIVE_MINUTES_IN_SECONDS,
    onClear,
    clearLabel = "Clear time",
    className,
    disabled = false,
    readOnly = false,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const ids = fieldIds(id ?? generatedId, {
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  });

  const showClear = Boolean(onClear) && Boolean(value) && !disabled && !readOnly;

  return (
    <Field
      ids={ids}
      label={label}
      labelHidden={labelHidden}
      {...(description ? { description } : {})}
      {...(error ? { error } : {})}
      disabled={disabled}
      {...(className ? { className } : {})}
    >
      <div className="lifeos-field__control">
        <input
          {...rest}
          ref={ref}
          id={ids.controlId}
          type="time"
          step={step}
          className="lifeos-field__element lifeos-date-time__element"
          disabled={disabled}
          readOnly={readOnly}
          {...(value === undefined ? {} : { value })}
          aria-describedby={ids.describedBy}
          aria-invalid={error ? true : undefined}
        />

        {showClear ? (
          <IconButton
            icon={X}
            label={clearLabel}
            size="sm"
            variant="ghost"
            onClick={onClear}
            tabIndex={-1}
          />
        ) : null}
      </div>
    </Field>
  );
});
