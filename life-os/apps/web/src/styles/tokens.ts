/**
 * The frozen LifeOS design token contract (LOS-0301).
 *
 * `tokens.css` is the runtime source of truth; this module mirrors the values
 * that TypeScript needs — resolved colors for contrast proofs and chart series,
 * plus breakpoints and stacking order for logic that cannot read CSS.
 * `tokens.test.ts` fails when the two drift apart.
 */

import { CONTRAST_MINIMUM } from "./contrast";

/** Resolved values of every semantic color token, keyed by custom property. */
export const COLOR_TOKENS = Object.freeze({
  "--lifeos-color-canvas": "#f7f9fc",
  "--lifeos-color-surface": "#ffffff",
  "--lifeos-color-surface-muted": "#f3f6fa",
  "--lifeos-color-surface-raised": "#fbfcfe",

  "--lifeos-color-text": "#101828",
  "--lifeos-color-text-secondary": "#475467",
  "--lifeos-color-text-muted": "#667085",
  "--lifeos-color-text-on-solid": "#ffffff",

  "--lifeos-color-border": "#e4e7ec",
  "--lifeos-color-border-strong": "#d0d5dd",
  "--lifeos-color-border-interactive": "#7d8b9f",

  "--lifeos-color-primary": "#3157f5",
  "--lifeos-color-primary-hover": "#2446d8",
  "--lifeos-color-primary-active": "#1d3fcc",
  "--lifeos-color-primary-soft": "#eef2ff",
  "--lifeos-color-primary-border": "#c3cffd",
  "--lifeos-color-on-primary-soft": "#1d3fcc",

  "--lifeos-color-success": "#087443",
  "--lifeos-color-success-accent": "#12a150",
  "--lifeos-color-success-soft": "#e8f6ee",

  "--lifeos-color-warning": "#b54708",
  "--lifeos-color-warning-accent": "#dc6803",
  "--lifeos-color-warning-soft": "#fef6e7",

  "--lifeos-color-danger": "#b42318",
  "--lifeos-color-danger-accent": "#f04438",
  "--lifeos-color-danger-soft": "#fef3f2",

  "--lifeos-color-info": "#175cd3",
  "--lifeos-color-info-accent": "#2e90fa",
  "--lifeos-color-info-soft": "#eaf4fe",

  "--lifeos-color-accent": "#5925dc",
  "--lifeos-color-accent-highlight": "#7a5af8",
  "--lifeos-color-accent-soft": "#f4f1fe",

  "--lifeos-color-focus-ring": "#2446d8",
  "--lifeos-color-selection": "#eef2ff",
});

export type ColorTokenName = keyof typeof COLOR_TOKENS;

/** Ordered categorical chart series. Order is part of the frozen contract. */
export const CHART_SERIES_TOKENS = Object.freeze([
  "--lifeos-chart-1",
  "--lifeos-chart-2",
  "--lifeos-chart-3",
  "--lifeos-chart-4",
  "--lifeos-chart-5",
  "--lifeos-chart-6",
  "--lifeos-chart-7",
  "--lifeos-chart-8",
] as const);

export const CHART_TOKENS = Object.freeze({
  "--lifeos-chart-1": "#2446d8",
  "--lifeos-chart-2": "#087443",
  "--lifeos-chart-3": "#b54708",
  "--lifeos-chart-4": "#5925dc",
  "--lifeos-chart-5": "#0e7090",
  "--lifeos-chart-6": "#b42318",
  "--lifeos-chart-7": "#a8218a",
  "--lifeos-chart-8": "#4f6b0c",
  "--lifeos-chart-grid": "#e4e7ec",
  "--lifeos-chart-axis": "#475467",
  "--lifeos-chart-track": "#f3f6fa",
});

/** Viewport breakpoints in CSS pixels. Mirrors `--lifeos-breakpoint-*`. */
export const BREAKPOINTS = Object.freeze({
  sm: 480,
  md: 768,
  lg: 1200,
  xl: 1440,
});

/** Smallest supported viewport width; every layout must remain usable here. */
export const MIN_SUPPORTED_VIEWPORT_WIDTH = 320;

/** The complete stacking contract. Mirrors `--lifeos-z-*`. */
export const Z_INDEX = Object.freeze({
  base: 0,
  raised: 10,
  sticky: 100,
  navigation: 200,
  drawer: 300,
  overlay: 400,
  dialog: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  skipLink: 900,
});

export type DensityMode = "comfortable" | "compact";

export interface ContrastRequirement {
  readonly foreground: ColorTokenName;
  readonly background: ColorTokenName;
  readonly minimum: number;
  readonly usage: string;
}

/**
 * Every token pairing the design system is allowed to render. A pairing that is
 * not listed here has not been proven accessible and must not be used.
 */
export const CONTRAST_REQUIREMENTS: readonly ContrastRequirement[] = Object.freeze([
  // Body and secondary text on every background surface.
  {
    foreground: "--lifeos-color-text",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Primary text on the application canvas",
  },
  {
    foreground: "--lifeos-color-text",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Primary text on cards and panels",
  },
  {
    foreground: "--lifeos-color-text",
    background: "--lifeos-color-surface-muted",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Primary text on muted surfaces such as table headers",
  },
  {
    foreground: "--lifeos-color-text-secondary",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Supporting text on the canvas",
  },
  {
    foreground: "--lifeos-color-text-secondary",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Supporting text on surfaces",
  },
  {
    foreground: "--lifeos-color-text-secondary",
    background: "--lifeos-color-surface-muted",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Supporting text on muted surfaces",
  },
  {
    foreground: "--lifeos-color-text-muted",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Muted labels and captions on the canvas",
  },
  {
    foreground: "--lifeos-color-text-muted",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Muted labels and captions on surfaces",
  },
  {
    foreground: "--lifeos-color-text-muted",
    background: "--lifeos-color-surface-muted",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Muted labels and captions on muted surfaces",
  },

  // Text on solid status fills.
  {
    foreground: "--lifeos-color-text-on-solid",
    background: "--lifeos-color-primary",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Primary button label",
  },
  {
    foreground: "--lifeos-color-text-on-solid",
    background: "--lifeos-color-primary-hover",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Primary button label while hovered",
  },
  {
    foreground: "--lifeos-color-text-on-solid",
    background: "--lifeos-color-primary-active",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Primary button label while pressed",
  },
  {
    foreground: "--lifeos-color-text-on-solid",
    background: "--lifeos-color-success",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Label on a solid success fill",
  },
  {
    foreground: "--lifeos-color-text-on-solid",
    background: "--lifeos-color-warning",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Label on a solid warning fill",
  },
  {
    foreground: "--lifeos-color-text-on-solid",
    background: "--lifeos-color-danger",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Label on a solid danger fill, including destructive buttons",
  },
  {
    foreground: "--lifeos-color-text-on-solid",
    background: "--lifeos-color-info",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Label on a solid info fill",
  },
  {
    foreground: "--lifeos-color-text-on-solid",
    background: "--lifeos-color-accent",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Label on a solid accent fill",
  },

  // Status text on its own soft background — badges, alerts and inline messages.
  {
    foreground: "--lifeos-color-on-primary-soft",
    background: "--lifeos-color-primary-soft",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Primary badge and soft-emphasis label",
  },
  {
    foreground: "--lifeos-color-success",
    background: "--lifeos-color-success-soft",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Success badge and inline success message",
  },
  {
    foreground: "--lifeos-color-warning",
    background: "--lifeos-color-warning-soft",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Warning badge and inline warning message",
  },
  {
    foreground: "--lifeos-color-danger",
    background: "--lifeos-color-danger-soft",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Danger badge and inline validation error",
  },
  {
    foreground: "--lifeos-color-info",
    background: "--lifeos-color-info-soft",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Info badge and inline info message",
  },
  {
    foreground: "--lifeos-color-accent",
    background: "--lifeos-color-accent-soft",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Accent badge",
  },

  // Status text used directly on the neutral surfaces.
  {
    foreground: "--lifeos-color-danger",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Field error text under an input",
  },
  {
    foreground: "--lifeos-color-success",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Saved confirmation text",
  },
  {
    foreground: "--lifeos-color-warning",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Warning text on a surface",
  },
  {
    foreground: "--lifeos-color-primary",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Link and ghost-button label on a surface",
  },
  {
    foreground: "--lifeos-color-primary",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.normalText,
    usage: "Link and ghost-button label on the canvas",
  },

  // Non-text boundaries: focus, interactive borders and status accents.
  {
    foreground: "--lifeos-color-focus-ring",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Focus ring against the canvas",
  },
  {
    foreground: "--lifeos-color-focus-ring",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Focus ring against surfaces",
  },
  {
    foreground: "--lifeos-color-border-interactive",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Input and control border on a surface",
  },
  {
    foreground: "--lifeos-color-border-interactive",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Input and control border on the canvas",
  },
  {
    foreground: "--lifeos-color-success-accent",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Success status dot and icon",
  },
  {
    foreground: "--lifeos-color-warning-accent",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Warning status dot and icon",
  },
  {
    foreground: "--lifeos-color-danger-accent",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Danger status dot and icon",
  },
  {
    foreground: "--lifeos-color-info-accent",
    background: "--lifeos-color-surface",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Info status dot and icon",
  },
  {
    foreground: "--lifeos-color-success-accent",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Success status dot on the canvas",
  },
  {
    foreground: "--lifeos-color-warning-accent",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Warning status dot on the canvas",
  },
  {
    foreground: "--lifeos-color-danger-accent",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Danger status dot on the canvas",
  },
  {
    foreground: "--lifeos-color-info-accent",
    background: "--lifeos-color-canvas",
    minimum: CONTRAST_MINIMUM.nonText,
    usage: "Info status dot on the canvas",
  },
]);
