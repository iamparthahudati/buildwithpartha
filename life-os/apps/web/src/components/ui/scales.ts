/**
 * Shared scales for the UI primitives.
 *
 * These live apart from the components so each component module exports only
 * components, which keeps React Fast Refresh working during development.
 */

export type IconSize = "sm" | "md" | "lg" | "xl";

/**
 * Sizes are named, not numeric, so an icon cannot drift away from the type it
 * sits beside. Each maps to a token in `icon.css`.
 */
export const ICON_SIZES: readonly IconSize[] = Object.freeze(["sm", "md", "lg", "xl"]);

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export const BUTTON_VARIANTS: readonly ButtonVariant[] = Object.freeze([
  "primary",
  "secondary",
  "ghost",
  "danger",
  "link",
]);

export const BUTTON_SIZES: readonly ButtonSize[] = Object.freeze(["sm", "md", "lg"]);

/**
 * Badge and status tones. `neutral` is the default because most badges carry
 * information rather than a warning; reaching for a status color should be a
 * deliberate choice.
 */
export type BadgeTone =
  "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "accent";

export const BADGE_TONES: readonly BadgeTone[] = Object.freeze([
  "neutral",
  "primary",
  "success",
  "warning",
  "danger",
  "info",
  "accent",
]);

/**
 * Canonical Task status tones, mapped from the stored values in the product
 * vocabulary so a status never picks up an ad-hoc color at a call site.
 */
export const TASK_STATUS_TONE: Readonly<Record<string, BadgeTone>> = Object.freeze({
  TO_DO: "neutral",
  IN_PROGRESS: "info",
  BLOCKED: "warning",
  DONE: "success",
  CANCELLED: "neutral",
});

/** Canonical Product priority tones. P1 is the only one that reads as urgent. */
export const PRIORITY_TONE: Readonly<Record<string, BadgeTone>> = Object.freeze({
  P1: "danger",
  P2: "primary",
  P3: "neutral",
  P4: "neutral",
});

export type AvatarSize = "xs" | "sm" | "md" | "lg";

export const AVATAR_SIZES: readonly AvatarSize[] = Object.freeze(["xs", "sm", "md", "lg"]);
