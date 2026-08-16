# LifeOS design tokens

Frozen by LOS-0301. Every component ticket from LOS-0302 onward consumes these tokens and never introduces raw color, spacing or motion values.

- Runtime source of truth: `apps/web/src/styles/tokens.css`.
- TypeScript mirror for logic that cannot read CSS: `apps/web/src/styles/tokens.ts`.
- Contrast math used by the proofs: `apps/web/src/styles/contrast.ts`.

## Two layers

`tokens.css` declares two layers.

1. **Private palette** (`--palette-*`) holds the literal color values. Only `tokens.css` may declare or reference it.
2. **Semantic contract** (`--lifeos-*`) names the role a value plays. Components use only this layer.

Naming a role rather than a hue is what lets a value change once without touching components. `npm run verify:tokens` fails the build when any file outside `styles/tokens.css` uses a hex, `rgb()`, `hsl()`, `color()` or named CSS color, or reads the private palette.

## Color roles

| Role                              | Token                                                                                                                                      | Value                                      | Notes                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------ |
| Application canvas                | `--lifeos-color-canvas`                                                                                                                    | `#f7f9fc`                                  | Page background behind all surfaces.             |
| Surface                           | `--lifeos-color-surface`                                                                                                                   | `#ffffff`                                  | Cards, panels, dialogs, table bodies.            |
| Muted surface                     | `--lifeos-color-surface-muted`                                                                                                             | `#f3f6fa`                                  | Table headers, inset regions, tracks.            |
| Raised surface                    | `--lifeos-color-surface-raised`                                                                                                            | `#fbfcfe`                                  | Hover and stacked surface separation.            |
| Scrim                             | `--lifeos-color-overlay`                                                                                                                   | `rgb(16 24 40 / 55%)`                      | Dialog and drawer backdrop.                      |
| Primary text                      | `--lifeos-color-text`                                                                                                                      | `#101828`                                  | Default body and heading color.                  |
| Secondary text                    | `--lifeos-color-text-secondary`                                                                                                            | `#475467`                                  | Descriptions and supporting copy.                |
| Muted text                        | `--lifeos-color-text-muted`                                                                                                                | `#667085`                                  | Captions and field hints; still AA at 12px.      |
| Text on solid fills               | `--lifeos-color-text-on-solid`                                                                                                             | `#ffffff`                                  | Labels on primary and status fills.              |
| Border                            | `--lifeos-color-border`                                                                                                                    | `#e4e7ec`                                  | Decorative separation between blocks.            |
| Strong border                     | `--lifeos-color-border-strong`                                                                                                             | `#d0d5dd`                                  | Emphasized structural boundaries.                |
| Interactive border                | `--lifeos-color-border-interactive`                                                                                                        | `#7d8b9f`                                  | Input and control outlines; passes 3:1.          |
| Primary                           | `--lifeos-color-primary`                                                                                                                   | `#3157f5`                                  | Primary action fill and link color.              |
| Primary hover / active            | `--lifeos-color-primary-hover` / `-active`                                                                                                 | `#2446d8` / `#1d3fcc`                      | Pointer and pressed states.                      |
| Primary soft                      | `--lifeos-color-primary-soft`                                                                                                              | `#eef2ff`                                  | Selected rows, soft badges, selection.           |
| On primary soft                   | `--lifeos-color-on-primary-soft`                                                                                                           | `#1d3fcc`                                  | Text on `--lifeos-color-primary-soft`.           |
| Success / warning / danger / info | `--lifeos-color-success` `#087443`, `--lifeos-color-warning` `#b54708`, `--lifeos-color-danger` `#b42318`, `--lifeos-color-info` `#175cd3` |                                            | AA as text and as solid fills with white labels. |
| Status accents                    | `--lifeos-color-*-accent`                                                                                                                  | `#12a150`, `#dc6803`, `#f04438`, `#2e90fa` | Dots, icons and fills only; each passes 3:1.     |
| Status soft                       | `--lifeos-color-*-soft`                                                                                                                    | `#e8f6ee`, `#fef6e7`, `#fef3f2`, `#eaf4fe` | Badge and inline-message backgrounds.            |
| Accent                            | `--lifeos-color-accent` / `-highlight` / `-soft`                                                                                           | `#5925dc` / `#7a5af8` / `#f4f1fe`          | Secondary categorical emphasis.                  |
| Focus ring                        | `--lifeos-color-focus-ring`                                                                                                                | `#2446d8`                                  | Always paired with a 2px ring and 2px offset.    |

Color never carries meaning alone. Status always ships with text or an icon, per the accessibility contract in [the design system](./03-DESIGN-SYSTEM.md).

## Proven contrast pairings

`CONTRAST_REQUIREMENTS` in `tokens.ts` lists every pairing the design system is allowed to render, each with its WCAG 2.2 AA minimum and its usage. `tokens.test.ts` computes the real ratio for every entry. A pairing that is not listed has not been proven and must not be used; adding a pairing means adding it to that list first.

Minimums applied: 4.5:1 for normal text, 3:1 for large text, 3:1 for borders, focus rings, icons and chart marks.

## Typography

`--lifeos-font-sans` is the Inter-led stack; `--lifeos-font-mono` covers code and identifiers. `--lifeos-font-numeric` (`tabular-nums lining-nums`) is required for durations, dates, metrics and timers so values do not shift width as they change.

Sizes run `--lifeos-font-size-3xs` (12px) through `--lifeos-font-size-4xl` (48px). 16px (`md`) is the default body size, 14px (`xs`) is the dense-UI size, and 12px is a hard floor. Every size is declared in `rem` so browser text scaling and 200% zoom both work; the Node token test fails if any size, spacing or radius token is declared in `px`.

Weights are 400/500/600/700, line heights are 1.2/1.35/1.5/1.65, and letter spacing covers tight, normal and wide.

## Spacing, radius, border and shadow

Spacing is a 4px base on an 8px rhythm: `--lifeos-space-0` through `--lifeos-space-16` (0–64px). Radius is `xs` 4px, `sm` 6px, `md` 8px, `lg` 12px, `xl` 16px and `pill`.

Border widths are `hairline` 1px, `thick` 2px and `focus` 2px with a 2px `--lifeos-focus-ring-offset`. Five shadow steps (`xs` through `xl`) supply depth only; a shadow is never the only boundary of a surface.

## Stacking

`--lifeos-z-*` is the complete stacking contract, and no component may invent a `z-index` outside it:

`base` 0 → `raised` 10 → `sticky` 100 → `navigation` 200 → `drawer` 300 → `overlay` 400 → `dialog` 500 → `popover` 600 → `tooltip` 700 → `toast` 800 → `skip-link` 900.

The skip link sits above everything so keyboard users can always reach it. `Z_INDEX` in `tokens.ts` mirrors the scale for logic that must compare layers, and the tests keep the order strictly ascending.

## Motion

Durations are `instant` 0ms, `fast` 120ms, `normal` 200ms, `slow` 320ms and `deliberate` 480ms, with `standard`, `entrance`, `exit` and `linear` easings. `--lifeos-motion-delay-hover-in` (400ms) and `-hover-out` (100ms) are the shared hover-intent delays for Tooltip and similar surfaces.

Under `prefers-reduced-motion: reduce`, every non-zero duration token is redefined to `0ms` in `tokens.css`. Components that animate through these tokens therefore respect the setting without writing their own media query, and a test enforces that no animated duration escapes the override.

## Breakpoints and layout

| Token                    | Value  | Band                            |
| ------------------------ | ------ | ------------------------------- |
| `--lifeos-breakpoint-sm` | 480px  | Large phone.                    |
| `--lifeos-breakpoint-md` | 768px  | Tablet; navigation rail begins. |
| `--lifeos-breakpoint-lg` | 1200px | Desktop; persistent sidebar.    |
| `--lifeos-breakpoint-xl` | 1440px | Wide desktop.                   |

`--lifeos-layout-min-width` is 320px, the smallest supported viewport. `--lifeos-layout-sidebar-width` is 240px, inside the documented 232–256px band. `--lifeos-layout-reading-max` (68ch) bounds long-form text and `--lifeos-layout-content-max` bounds page width.

## Density

Comfortable is the default. `[data-density="compact"]` on any container reduces control height (40px → 32px), row height (48px → 36px), gaps and font size for dense tables and lists.

Compact never wins over touch: under `@media (pointer: coarse)`, compact control and row heights are restored to `--lifeos-target-min-size` (44px), so the minimum pointer target holds on touch devices regardless of density.

## Charts

Eight ordered categorical series (`--lifeos-chart-1` … `-8`) each pass 3:1 against the surface and are distinct values, so a series remains identifiable without relying on hue discrimination alone. `--lifeos-chart-axis` meets the 4.5:1 text minimum, `--lifeos-chart-grid` is deliberately quieter than the axis, and `--lifeos-chart-track` is the empty-progress track. Charts still require a text summary or data table.

## Changing a token

Tokens are frozen: changing a value is a design-system change, not an implementation detail. Change `tokens.css`, update the mirrored value in `tokens.ts`, add or update the affected entry in `CONTRAST_REQUIREMENTS`, run `npm test`, and record the reason in the ticket. The parity tests fail if the stylesheet and the TypeScript mirror disagree.
