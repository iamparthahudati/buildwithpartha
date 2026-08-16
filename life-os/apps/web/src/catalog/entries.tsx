import { CHART_SERIES_TOKENS, Z_INDEX } from "@styles/tokens";

import { Swatch } from "./Swatch";
import type { CatalogEntry } from "./registry";

/*
 * Foundation entries. Atoms register themselves here as their tickets land
 * (LOS-0304 onward), which is what makes a missing state visible.
 */

const SURFACE_TOKENS = [
  "--lifeos-color-canvas",
  "--lifeos-color-surface",
  "--lifeos-color-surface-muted",
  "--lifeos-color-surface-raised",
] as const;

const TEXT_TOKENS = [
  "--lifeos-color-text",
  "--lifeos-color-text-secondary",
  "--lifeos-color-text-muted",
] as const;

const STATUS_TOKENS = [
  "--lifeos-color-primary",
  "--lifeos-color-success",
  "--lifeos-color-warning",
  "--lifeos-color-danger",
  "--lifeos-color-info",
  "--lifeos-color-accent",
] as const;

const FONT_SIZES = [
  { token: "--lifeos-font-size-4xl", label: "4xl — 48px" },
  { token: "--lifeos-font-size-3xl", label: "3xl — 36px" },
  { token: "--lifeos-font-size-2xl", label: "2xl — 28px" },
  { token: "--lifeos-font-size-xl", label: "xl — 22px" },
  { token: "--lifeos-font-size-lg", label: "lg — 18px" },
  { token: "--lifeos-font-size-md", label: "md — 16px, default body" },
  { token: "--lifeos-font-size-xs", label: "xs — 14px, dense UI" },
  { token: "--lifeos-font-size-3xs", label: "3xs — 12px, hard floor" },
] as const;

const SPACE_TOKENS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;
const RADIUS_TOKENS = ["xs", "sm", "md", "lg", "xl", "pill"] as const;
const SHADOW_TOKENS = ["xs", "sm", "md", "lg", "xl"] as const;
const DURATION_TOKENS = [
  { token: "--lifeos-motion-duration-fast", label: "fast — 120ms" },
  { token: "--lifeos-motion-duration-normal", label: "normal — 200ms" },
  { token: "--lifeos-motion-duration-slow", label: "slow — 320ms" },
  { token: "--lifeos-motion-duration-deliberate", label: "deliberate — 480ms" },
] as const;

export const CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "color",
    name: "Color",
    group: "Foundations",
    summary:
      "Semantic color roles. Components consume these names; the private palette behind them is never referenced directly.",
    states: [
      {
        id: "surfaces",
        name: "Surfaces",
        description: "Backgrounds, from the page canvas up to a raised surface.",
        render: () => (
          <div className="specimen-grid">
            {SURFACE_TOKENS.map((token) => (
              <Swatch key={token} token={token} bordered />
            ))}
          </div>
        ),
      },
      {
        id: "text",
        name: "Text",
        description: "Every text role passes AA against canvas, surface and muted surface.",
        render: () => (
          <div className="specimen-stack">
            {TEXT_TOKENS.map((token) => (
              <p key={token} style={{ color: `var(${token})` }}>
                <code>{token}</code> — The quick brown fox jumps over the lazy dog.
              </p>
            ))}
          </div>
        ),
      },
      {
        id: "status",
        name: "Status",
        description:
          "Solid fills carry white labels at AA. Color never carries meaning alone; a label or icon always accompanies it.",
        render: () => (
          <div className="specimen-row">
            {STATUS_TOKENS.map((token) => (
              <span
                key={token}
                className="specimen-pill"
                style={{
                  background: `var(${token})`,
                  color: "var(--lifeos-color-text-on-solid)",
                }}
              >
                {token.replace("--lifeos-color-", "")}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "charts",
        name: "Chart series",
        description: "Eight categorical series, each distinguishable against the surface.",
        render: () => (
          <div className="specimen-row">
            {CHART_SERIES_TOKENS.map((token, index) => (
              <span
                key={token}
                className="specimen-pill"
                style={{ background: `var(${token})`, color: "var(--lifeos-color-text-on-solid)" }}
              >
                Series {index + 1}
              </span>
            ))}
          </div>
        ),
      },
    ],
  },
  {
    id: "typography",
    name: "Typography",
    group: "Foundations",
    summary: "The type scale, weights and the tabular numerals required for metrics and timers.",
    states: [
      {
        id: "scale",
        name: "Scale",
        description: "Every size is declared in rem so browser text scaling and 200% zoom work.",
        render: () => (
          <div className="specimen-stack">
            {FONT_SIZES.map(({ token, label }) => (
              <p key={token} style={{ fontSize: `var(${token})` }}>
                {label}
              </p>
            ))}
          </div>
        ),
      },
      {
        id: "numerals",
        name: "Numerals",
        description:
          "Durations, dates, metrics and timers use tabular numerals so values do not shift width as they change.",
        render: () => (
          <div className="specimen-stack">
            <p style={{ fontVariantNumeric: "var(--lifeos-font-numeric)" }}>
              00:11:22 · 1,480 · 2026-08-17
            </p>
            <p>00:11:22 · 1,480 · 2026-08-17 (proportional, for comparison)</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "space",
    name: "Space and radius",
    group: "Foundations",
    summary: "A 4px base on an 8px rhythm, and the corner radii used across surfaces.",
    states: [
      {
        id: "spacing",
        name: "Spacing",
        description: "Spacing steps from 4px to 64px.",
        render: () => (
          <div className="specimen-stack">
            {SPACE_TOKENS.map((step) => (
              <div key={step} className="specimen-measure">
                <span
                  className="specimen-measure__bar"
                  style={{ width: `var(--lifeos-space-${step})` }}
                />
                <code>--lifeos-space-{step}</code>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: "radius",
        name: "Radius",
        description: "Corner radii, from a control to a fully rounded pill.",
        render: () => (
          <div className="specimen-row">
            {RADIUS_TOKENS.map((step) => (
              <span
                key={step}
                className="specimen-tile"
                style={{ borderRadius: `var(--lifeos-radius-${step})` }}
              >
                {step}
              </span>
            ))}
          </div>
        ),
      },
    ],
  },
  {
    id: "elevation",
    name: "Elevation",
    group: "Foundations",
    summary: "Shadows supply depth only; a shadow is never the sole boundary of a surface.",
    states: [
      {
        id: "shadows",
        name: "Shadows",
        description: "Five steps, each paired with a real border in production surfaces.",
        render: () => (
          <div className="specimen-row">
            {SHADOW_TOKENS.map((step) => (
              <span
                key={step}
                className="specimen-tile"
                style={{ boxShadow: `var(--lifeos-shadow-${step})` }}
              >
                {step}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: "stacking",
        name: "Stacking",
        description: "The complete z-index contract. No component may invent a layer outside it.",
        render: () => (
          <ol className="specimen-stack">
            {Object.entries(Z_INDEX).map(([name, value]) => (
              <li key={name}>
                <code>{name}</code> — {value}
              </li>
            ))}
          </ol>
        ),
      },
    ],
  },
  {
    id: "motion",
    name: "Motion",
    group: "Foundations",
    summary:
      "Durations and easings. Every duration token is zeroed under prefers-reduced-motion, so hovering these specimens with the preference on produces no movement.",
    states: [
      {
        id: "durations",
        name: "Durations",
        description: "Hover a bar to play its duration.",
        render: () => (
          <div className="specimen-stack">
            {DURATION_TOKENS.map(({ token, label }) => (
              <div key={token} className="specimen-measure">
                <span
                  className="specimen-measure__bar specimen-measure__bar--animated"
                  style={{ transitionDuration: `var(${token})` }}
                />
                <code>{label}</code>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },
]);
