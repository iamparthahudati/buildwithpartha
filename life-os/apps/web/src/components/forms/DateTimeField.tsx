import { useId } from "react";
import { TriangleAlert } from "lucide-react";

import { DateInput, Icon, TimeInput, fieldIds } from "@components/ui";
import { resolveLocalDateTime, type LocalDate, type LocalTime } from "@lib/localDateTime";

import "./datetime-field.css";

/**
 * DateTimeField (LOS-0405).
 *
 * A `DateInput` and a `TimeInput` grouped under one `<fieldset>`/`<legend>`,
 * the same pattern `DateRangeField` (LOS-0404) uses for two related native
 * controls — a moment is one concept made of a date and a time, not two
 * unrelated fields that happen to sit together. Both stay `YYYY-MM-DD` and
 * `HH:mm` strings, never converted through a `Date` before this point.
 *
 * `timeZone` is required rather than optional, because it is not just a label
 * here: `resolveLocalDateTime` (`@lib/localDateTime`) needs it to check
 * whether the chosen date and time actually names a real moment in that zone.
 * Twice a year, in a zone that observes daylight saving, it does not — clocks
 * springing forward skip an hour that a user could still type into the field,
 * and clocks falling back repeat one, so the same wall time names two moments
 * an hour apart. The field surfaces both cases directly beside the inputs
 * that produced them, rather than leaving a caller to notice only once a
 * value fails somewhere downstream. A skipped hour has no valid answer and is
 * therefore an error; a repeated hour has an answer, just an underspecified
 * one, and is a warning that names the convention used to resolve it.
 */

export interface DateTimeValue {
  readonly date: LocalDate | null;
  readonly time: LocalTime | null;
}

export interface DateTimeFieldProps {
  readonly legend: string;
  readonly description?: string;
  /** A server or otherwise externally known problem. Takes priority over the built-in DST check. */
  readonly error?: string;
  readonly value: DateTimeValue;
  readonly onValueChange: (value: DateTimeValue) => void;
  /** Resolves what the date and time actually mean — never the browser's own clock zone. */
  readonly timeZone: string;
  readonly min?: LocalDate;
  readonly max?: LocalDate;
  readonly dateLabel?: string;
  readonly timeLabel?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
}

export function DateTimeField({
  legend,
  description,
  error,
  value,
  onValueChange,
  timeZone,
  min,
  max,
  dateLabel = "Date",
  timeLabel = "Time",
  disabled = false,
  readOnly = false,
  className,
}: DateTimeFieldProps) {
  const baseId = useId();

  const resolution =
    value.date !== null && value.time !== null
      ? resolveLocalDateTime(value.date, value.time, timeZone)
      : undefined;

  const gapError =
    resolution?.kind === "nonexistent"
      ? `This time does not exist in ${timeZone} because of a daylight saving change. Choose a different time.`
      : undefined;
  const foldWarning =
    resolution?.kind === "ambiguous"
      ? `This time happens twice in ${timeZone} because of a daylight saving change. It is treated as the earlier occurrence.`
      : undefined;

  // A problem the caller already knows about (e.g. a server rule) outranks
  // the field's own DST check, the same precedence DateRangeField gives its
  // order check.
  const effectiveError = error ?? gapError;

  const ids = fieldIds(baseId, {
    hasDescription: Boolean(description),
    hasError: Boolean(effectiveError),
  });
  const warningId = foldWarning === undefined ? undefined : `${baseId}-warning`;
  // The error is announced first, because it is the most important thing to
  // hear; the warning next, because it is specific to this value; the
  // description last, because it is a static hint the user has likely
  // already read.
  const describedBy =
    [ids.errorId, warningId, ids.descriptionId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      className={["lifeos-datetime-field", className].filter(Boolean).join(" ")}
      aria-describedby={describedBy}
      aria-invalid={effectiveError ? true : undefined}
      disabled={disabled}
    >
      <legend className="lifeos-datetime-field__legend">{legend}</legend>

      <div className="lifeos-datetime-field__inputs">
        <DateInput
          label={dateLabel}
          value={value.date ?? ""}
          {...(min === undefined ? {} : { min })}
          {...(max === undefined ? {} : { max })}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) =>
            onValueChange({ date: emptyToNull(event.target.value), time: value.time })
          }
          onClear={() => onValueChange({ date: null, time: value.time })}
          // Two identically-worded "Clear date" buttons would leave a
          // keyboard or screen-reader user unable to tell the date's clear
          // action apart from the time's.
          clearLabel={`Clear ${dateLabel.toLowerCase()}`}
        />
        <TimeInput
          label={timeLabel}
          value={value.time ?? ""}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) =>
            onValueChange({ date: value.date, time: emptyToNull(event.target.value) })
          }
          onClear={() => onValueChange({ date: value.date, time: null })}
          clearLabel={`Clear ${timeLabel.toLowerCase()}`}
        />
      </div>

      {/*
        Named per the tone guide's rule to show the zone "when a time could
        otherwise be ambiguous" — which describes this field by definition,
        not only during its DST edge cases.
      */}
      <span className="lifeos-datetime-field__zone">Times shown in {timeZone}.</span>

      {description ? (
        <span id={ids.descriptionId} className="lifeos-field__description">
          {description}
        </span>
      ) : null}

      {foldWarning ? (
        <span id={warningId} className="lifeos-field__warning" role="status">
          <Icon icon={TriangleAlert} decorative size="sm" />
          {foldWarning}
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

function emptyToNull(value: string): LocalDate | LocalTime | null {
  return value === "" ? null : value;
}
