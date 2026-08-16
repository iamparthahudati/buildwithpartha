import { useId } from "react";

import { DateInput, fieldIds } from "@components/ui";
import { compareLocalDates, todayLocalDate, type LocalDate } from "@lib/localDateTime";

import "./date-range-field.css";

/**
 * DateRangeField (LOS-0404).
 *
 * Two `DateInput`s (LOS-0318) grouped under one real `<fieldset>`/`<legend>`,
 * the same pattern `RadioGroup` (LOS-0312) uses for a related group of native
 * controls rather than a single one — a range is one concept made of two
 * dates, not two unrelated fields that happen to sit next to each other.
 *
 * Every value stays a `YYYY-MM-DD` string end to end, exactly like `DateInput`
 * itself: a range is never converted through a `Date`, which would attach a
 * time of day and zone neither side of the range carries.
 */

export interface DateRangeValue {
  readonly start: LocalDate | null;
  readonly end: LocalDate | null;
}

export interface DateRangePreset {
  readonly label: string;
  /** Computed from today, so a saved preset stays correct on a later visit. */
  readonly range: (today: LocalDate) => DateRangeValue;
}

export interface DateRangeFieldProps {
  readonly legend: string;
  readonly description?: string;
  /** A server or otherwise externally known problem. Takes priority over the built-in order check. */
  readonly error?: string;
  readonly value: DateRangeValue;
  readonly onValueChange: (value: DateRangeValue) => void;
  /** Required to resolve "today" for presets — never the browser's own clock zone. */
  readonly timeZone: string;
  readonly min?: LocalDate;
  readonly max?: LocalDate;
  readonly presets?: readonly DateRangePreset[];
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function DateRangeField({
  legend,
  description,
  error,
  value,
  onValueChange,
  timeZone,
  min,
  max,
  presets,
  startLabel = "Start date",
  endLabel = "End date",
  disabled = false,
  className,
}: DateRangeFieldProps) {
  const baseId = useId();
  const orderError =
    value.start !== null && value.end !== null && compareLocalDates(value.start, value.end) > 0
      ? "Choose an end date on or after the start date."
      : undefined;
  const effectiveError = error ?? orderError;

  const ids = fieldIds(baseId, {
    hasDescription: Boolean(description),
    hasError: Boolean(effectiveError),
  });

  // Each side additionally constrains the other's native picker: an end date
  // cannot be chosen before the start, and vice versa, on top of the message
  // above — the browser's own picker enforces it as the user is choosing,
  // not only after they submit.
  const startMax = maxOf(max, value.end);
  const endMin = minOf(min, value.start);

  return (
    <fieldset
      className={["lifeos-date-range-field", className].filter(Boolean).join(" ")}
      aria-describedby={ids.describedBy}
      aria-invalid={effectiveError ? true : undefined}
      disabled={disabled}
    >
      <legend className="lifeos-date-range-field__legend">{legend}</legend>

      {presets && presets.length > 0 ? (
        <div className="lifeos-date-range-field__presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="lifeos-date-range-field__preset"
              disabled={disabled}
              onClick={() => onValueChange(preset.range(todayLocalDate(timeZone)))}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="lifeos-date-range-field__inputs">
        <DateInput
          label={startLabel}
          value={value.start ?? ""}
          {...(min === undefined ? {} : { min })}
          {...(startMax === undefined ? {} : { max: startMax })}
          disabled={disabled}
          onChange={(event) =>
            onValueChange({ start: emptyToNull(event.target.value), end: value.end })
          }
          onClear={() => onValueChange({ start: null, end: value.end })}
          // Two identically-worded "Clear date" buttons would leave a
          // keyboard or screen-reader user unable to tell which field either
          // one belongs to.
          clearLabel={`Clear ${startLabel.toLowerCase()}`}
        />
        <DateInput
          label={endLabel}
          value={value.end ?? ""}
          {...(endMin === undefined ? {} : { min: endMin })}
          {...(max === undefined ? {} : { max })}
          disabled={disabled}
          onChange={(event) =>
            onValueChange({ start: value.start, end: emptyToNull(event.target.value) })
          }
          onClear={() => onValueChange({ start: value.start, end: null })}
          clearLabel={`Clear ${endLabel.toLowerCase()}`}
        />
      </div>

      {description ? (
        <span id={ids.descriptionId} className="lifeos-field__description">
          {description}
        </span>
      ) : null}

      {effectiveError ? (
        <span id={ids.errorId} className="lifeos-field__error" role="alert">
          {effectiveError}
        </span>
      ) : null}
    </fieldset>
  );
}

function emptyToNull(value: string): LocalDate | null {
  return value === "" ? null : value;
}

function maxOf(bound: LocalDate | undefined, other: LocalDate | null): LocalDate | undefined {
  if (other === null) {
    return bound;
  }
  if (bound === undefined) {
    return other;
  }
  return compareLocalDates(bound, other) < 0 ? bound : other;
}

function minOf(bound: LocalDate | undefined, other: LocalDate | null): LocalDate | undefined {
  if (other === null) {
    return bound;
  }
  if (bound === undefined) {
    return other;
  }
  return compareLocalDates(bound, other) > 0 ? bound : other;
}
