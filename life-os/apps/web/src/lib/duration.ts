/**
 * Canonical duration values (LOS-0406).
 *
 * An Estimate is stored in minutes (`29-PRODUCT-VOCABULARY.md`): a plain,
 * non-negative integer, with no hours/minutes split and no unit attached. This
 * module is the boundary between that stored number and the hours-and-minutes
 * shape a person actually thinks in — splitting it apart for entry, and
 * formatting it back into the compact/spoken pair the tone guide requires for
 * "Durations use compact localized units in dense UI … and a clear spoken
 * label … where needed."
 *
 * `Intl.NumberFormat`'s `unit` style is used rather than the newer
 * `Intl.DurationFormat`, which is not yet safe against the frozen browser
 * target (`browserslist`: Safari ≥16.4, Firefox ≥114) — `unit` style has been
 * supported since Safari 14.1 and Firefox 88.
 */

export interface DurationParts {
  readonly hours: number;
  readonly minutes: number;
}

/** Splits a non-negative minute total into whole hours and the remainder. */
export function toDurationParts(totalMinutes: number): DurationParts {
  const whole = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(whole / 60), minutes: whole % 60 };
}

/** Combines hours and minutes back into a single non-negative minute total. */
export function fromDurationParts(parts: DurationParts): number {
  return Math.max(0, Math.round(parts.hours)) * 60 + Math.max(0, Math.round(parts.minutes));
}

/**
 * Formats a duration for a person to read.
 *
 * A zero part is omitted rather than shown as "0 hr" beside the part that
 * actually matters — except when the whole duration is zero, when there is
 * nothing else to show. `compact` reads as "1 hr 30 min", the dense-UI form;
 * `long` reads as "1 hour 30 minutes", the form worth using where an
 * abbreviation would be worth spelling out.
 */
export function formatDurationMinutes(
  totalMinutes: number,
  locale: string,
  style: "compact" | "long" = "compact",
): string {
  const { hours, minutes } = toDurationParts(totalMinutes);
  const unitDisplay = style === "compact" ? "short" : "long";

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(formatUnit(hours, "hour", locale, unitDisplay));
  }
  if (minutes > 0 || hours === 0) {
    parts.push(formatUnit(minutes, "minute", locale, unitDisplay));
  }

  return parts.join(" ");
}

function formatUnit(
  value: number,
  unit: "hour" | "minute",
  locale: string,
  unitDisplay: "short" | "long",
): string {
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay }).format(value);
}
