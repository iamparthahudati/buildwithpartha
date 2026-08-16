/**
 * Identity helpers for `Avatar`. They live apart from the component so the
 * component module exports only components, which keeps React Fast Refresh
 * working during development.
 */

/** Deterministic accent count. Kept in sync with `avatar.css`. */
const ACCENT_COUNT = 6;

/**
 * Picks a stable accent from the name, so the same person keeps the same color
 * across sessions and devices without storing anything. A hash — not
 * `Math.random` — is what makes it recognisable rather than merely colorful.
 */
export function accentIndexForName(name: string): number {
  let hash = 0;
  for (const character of name.trim().toLowerCase()) {
    hash = (hash * 31 + character.codePointAt(0)!) % 1_000_000_007;
  }

  return hash % ACCENT_COUNT;
}

/**
 * Up to two initials, taken from the first and last word. Uses code points, so
 * names beginning with an emoji or an astral character are not split in half.
 */
export function initialsForName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }

  const first = [...words[0]!][0] ?? "";
  const last = words.length > 1 ? ([...words[words.length - 1]!][0] ?? "") : "";

  return (first + last).toLocaleUpperCase();
}
