import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { X } from "lucide-react";

import type { LocalDate } from "@lib/localDateTime";

import { Field } from "./Field";
import { IconButton } from "./IconButton";
import { fieldIds } from "./fieldIds";
import "./date-time-input.css";

/**
 * DateInput (LOS-0318).
 *
 * The value is a calendar date — `YYYY-MM-DD` — and it stays a string from the
 * input to the API and back. It is never put through a `Date` on the way,
 * because that would attach a time of day in the browser's own zone, and a user
 * whose confirmed timezone differs from their browser's would see their due
 * date land on the day before or after. `@lib/localDateTime` holds the only
 * supported conversions.
 *
 * `type="date"` is what makes the platform's own date picker and its localized
 * field order available; the value it exchanges is already the canonical form.
 */

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "children" | "size" | "type" | "prefix" | "value" | "defaultValue" | "min" | "max"
>;

export interface DateInputProps extends NativeProps {
  readonly label: string;
  /** Hides the label visually while keeping it for assistive technology. */
  readonly labelHidden?: boolean;
  readonly description?: string;
  readonly error?: string;
  /** A calendar date, `YYYY-MM-DD`. Never an instant. */
  readonly value?: LocalDate;
  readonly defaultValue?: LocalDate;
  /** The earliest selectable date, `YYYY-MM-DD`. */
  readonly min?: LocalDate;
  /** The latest selectable date, `YYYY-MM-DD`. */
  readonly max?: LocalDate;
  /** Shows a clear button once there is a date to clear. */
  readonly onClear?: () => void;
  readonly clearLabel?: string;
  readonly className?: string;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  {
    label,
    labelHidden = false,
    description,
    error,
    value,
    onClear,
    clearLabel = "Clear date",
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
          type="date"
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
            // Out of the tab order: the keyboard can already empty the field,
            // and a stop between every date would slow keyboard users down.
            tabIndex={-1}
          />
        ) : null}
      </div>
    </Field>
  );
});
