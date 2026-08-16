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
