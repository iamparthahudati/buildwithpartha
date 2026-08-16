/**
 * The single reading of "how far along is this" (LOS-0321).
 *
 * `ProgressBar` and `ProgressRing` draw the same number two ways, so the number
 * itself is computed once. Nothing here knows about a metric: a progress
 * component is given a value and a maximum, never a definition of completion.
 * Deciding what counts as done belongs to the feature that owns the metric.
 */

export interface ProgressReading {
  /** The value after clamping into range. */
  readonly value: number;
  readonly max: number;
  /** 0 to 1, safe to feed straight into CSS. */
  readonly ratio: number;
  /** A whole percentage that never contradicts the ratio it came from. */
  readonly percent: number;
}

export function readProgress(value: number, max: number): ProgressReading {
  // A zero, negative or non-finite maximum means there is nothing to measure
  // against. The reading is empty rather than NaN or full, and the maximum
  // falls back to 1 so the ARIA range stays valid.
  const hasRange = Number.isFinite(max) && max > 0;
  const safeMax = hasRange ? max : 1;
  const safeValue = hasRange
    ? Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), safeMax)
    : 0;
  const ratio = safeValue / safeMax;

  return { value: safeValue, max: safeMax, ratio, percent: wholePercent(ratio) };
}

/**
 * Rounding that cannot lie in either direction.
 *
 * Ordinary rounding turns 99.6% into "100%" beside a task list that still has
 * work in it, and 0.4% into "0%" beside a project that has genuinely started.
 * Only a true 0 reads as 0% and only a true 1 reads as 100%; everything between
 * is held inside 1–99.
 */
function wholePercent(ratio: number): number {
  if (ratio <= 0) {
    return 0;
  }
  if (ratio >= 1) {
    return 100;
  }

  return Math.min(99, Math.max(1, Math.round(ratio * 100)));
}
