/**
 * Pure timestamp formatting for `CommentList` (LOS-0432), paired with its
 * component the same way `chartValueFormat.ts` pairs with the charts.
 *
 * Two representations, never one: `docs/30-CONTENT-AND-TONE-GUIDE.md`'s own
 * "relative time supplements an absolute value where mistakes matter" rule
 * — `formatRelativeCommentTime` is the visible text, `formatAbsoluteCommentTime`
 * is what a screen reader actually announces (via the caller's `aria-label`),
 * so "2 hours ago" is never the only thing anyone has to go on.
 */

const RELATIVE_UNITS: readonly {
  readonly unit: Intl.RelativeTimeFormatUnit;
  readonly ms: number;
}[] = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
];

const JUST_NOW_THRESHOLD_MS = 60 * 1000;

export function formatRelativeCommentTime(instant: string, locale: string, now: Date): string {
  const diffMs = new Date(instant).getTime() - now.getTime();
  const absoluteMs = Math.abs(diffMs);

  if (absoluteMs < JUST_NOW_THRESHOLD_MS) {
    return "Just now";
  }

  // `absoluteMs` is always at least a minute here (the early return above
  // handles anything smaller), so this fallback is unreachable in practice —
  // it exists only to give `noUncheckedIndexedAccess` a real value instead of
  // an array-index lookup that TypeScript can't otherwise prove is safe.
  const match = RELATIVE_UNITS.find((entry) => absoluteMs >= entry.ms) ?? {
    unit: "minute",
    ms: 60 * 1000,
  };
  const value = Math.round(diffMs / match.ms);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, match.unit);
}

export function formatAbsoluteCommentTime(
  instant: string,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(instant));
}
