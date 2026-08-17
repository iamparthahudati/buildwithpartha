import { useId } from "react";

import { NumberInput, VisuallyHidden, fieldIds } from "@components/ui";
import { formatDurationMinutes, fromDurationParts, toDurationParts } from "@lib/duration";

import "./duration-field.css";

/**
 * DurationField (LOS-0406).
 *
 * An Estimate (`29-PRODUCT-VOCABULARY.md`) is stored as one non-negative
 * number of minutes with no unit attached, but nobody types "125" when they
 * mean two hours and five minutes — they think in hours and minutes. This
 * field is the boundary: two `NumberInput`s for entry, one canonical minute
 * total as its value, and `lib/duration.ts` doing every conversion between
 * them so the split and the total can never drift apart.
 *
 * ### Normalization
 *
 * The two inputs are never independent state — they are computed fresh from
 * `value` on every render, the same "derive, don't duplicate" shape
 * `DateRangeField` and `DateTimeField` use for their own paired fields. That
 * is what makes normalization automatic rather than a special case: typing
 * `90` into Minutes while Hours reads `1` produces a total of 150, which the
 * very next render re-splits into Hours `2`, Minutes `30`. There is no
 * "1h90m" state to clean up, because the malformed shape never gets stored —
 * only the corrected one, computed the instant it happens.
 *
 * ### Bounds
 *
 * `min`/`max` are checked, not enforced by rewriting what the user typed. An
 * earlier version clamped the total live on every keystroke; the bug that
 * caught it was concrete rather than theoretical — clearing Minutes below a
 * `min` snapped the field straight back to the floor value mid-edit, so the
 * very next digit typed landed appended to that snapped-back number instead
 * of replacing it. The fix follows the same shape `DateRangeField`'s order
 * check and `DateTimeField`'s daylight-saving check already use: derive
 * whether the current value is out of range and say so, the same "validate
 * after, don't rewrite while the user is mid-keystroke" rule the tone guide
 * already states for every other field.
 */

export interface DurationFieldProps {
  readonly legend: string;
  readonly description?: string;
  /** A problem the caller already knows about. Takes priority over the built-in bounds check. */
  readonly error?: string;
  /** The total duration in minutes. `null` is empty/unset, never zero. */
  readonly value: number | null;
  readonly onValueChange: (value: number | null) => void;
  /** Formats the readable summary and bounds messages. Never assumed from the browser. */
  readonly locale: string;
  readonly min?: number;
  readonly max?: number;
  readonly hoursLabel?: string;
  readonly minutesLabel?: string;
  readonly clearLabel?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly className?: string;
}

const MINUTES_IN_HOUR = 60;

export function DurationField({
  legend,
  description,
  error,
  value,
  onValueChange,
  locale,
  min,
  max,
  hoursLabel = "Hours",
  minutesLabel = "Minutes",
  clearLabel = "Clear duration",
  disabled = false,
  readOnly = false,
  className,
}: DurationFieldProps) {
  const baseId = useId();

  const boundsError =
    value === null
      ? undefined
      : min !== undefined && value < min
        ? `Enter a duration of at least ${formatDurationMinutes(min, locale, "long")}.`
        : max !== undefined && value > max
          ? `Enter a duration of at most ${formatDurationMinutes(max, locale, "long")}.`
          : undefined;

  // A problem the caller already knows about (e.g. a server rule) outranks
  // the field's own bounds check, the same precedence DateRangeField and
  // DateTimeField give their own built-in checks.
  const effectiveError = error ?? boundsError;

  const ids = fieldIds(baseId, {
    hasDescription: Boolean(description),
    hasError: Boolean(effectiveError),
  });

  const { hours, minutes } = toDurationParts(value ?? 0);
  const hasValue = value !== null;

  function commit(nextHours: number, nextMinutes: number) {
    // Only ever floors a fully-negative committed number (a paste, say) to
    // zero — never the caller's min/max, which stay a message rather than a
    // rewrite. A duration cannot be negative regardless of what min/max ask
    // for, so this floor is a structural invariant, not a business bound.
    onValueChange(fromDurationParts({ hours: nextHours, minutes: nextMinutes }));
  }

  const hoursMax = max === undefined ? undefined : Math.floor(max / MINUTES_IN_HOUR);

  return (
    <fieldset
      className={["lifeos-duration-field", className].filter(Boolean).join(" ")}
      aria-describedby={ids.describedBy}
      aria-invalid={effectiveError ? true : undefined}
      disabled={disabled}
    >
      <legend className="lifeos-duration-field__legend">{legend}</legend>

      <div className="lifeos-duration-field__inputs">
        <NumberInput
          label={hoursLabel}
          value={hasValue || hours > 0 ? hours : ""}
          min={0}
          {...(hoursMax === undefined ? {} : { max: hoursMax })}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => {
            const parsed = event.target.value === "" ? 0 : Number(event.target.value);
            commit(Math.max(0, parsed), minutes);
          }}
        />
        <NumberInput
          label={minutesLabel}
          value={hasValue || minutes > 0 ? minutes : ""}
          min={0}
          max={59}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => {
            const parsed = event.target.value === "" ? 0 : Number(event.target.value);
            commit(hours, Math.max(0, parsed));
          }}
        />

        {hasValue && !disabled && !readOnly ? (
          <button
            type="button"
            className="lifeos-duration-field__clear"
            onClick={() => onValueChange(null)}
          >
            {clearLabel}
          </button>
        ) : null}
      </div>

      {hasValue ? (
        <span className="lifeos-duration-field__summary">
          <span aria-hidden="true">{formatDurationMinutes(value, locale, "compact")}</span>
          <VisuallyHidden>{formatDurationMinutes(value, locale, "long")}</VisuallyHidden>
        </span>
      ) : null}

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
