# Atom phase gate

- Gate ticket: LOS-0333
- Date: 2026-08-17
- Result: Pass for proceeding from Epic 03 (design-system atoms) to Epic 04 (composed components); not a production or deployment approval
- Tested commit: `589588b` (branch `feature/LOS-0331-atom-audits-gate`, based on `develop`)
- Environment: Darwin arm64, Node 24.16.0, npm 11.13.0

## Gate boundary

This gate proves that every atom ticket in Epic 03 (LOS-0303 through LOS-0330) is implemented, catalogued, tested and internally consistent, and that LOS-0331/LOS-0332 found and closed the issues an audit at this scale should find. It freezes the **public API surface** of `apps/web/src/components/ui` for composed-component work: Epic 04 tickets may add new components and compose these, but may not change an existing exported component's prop names, required/optional status or semantics without a documented deviation.

It is not a production readiness, visual-regression, or cross-browser gate. Contrast, forced-colors and reduced-motion behavior are proven at the token/stylesheet level (JSDOM cannot render them); a real-browser pass is recorded as a follow-up in the LOS-0332 handoff, not as a gate blocker, because nothing in Epic 04's component composition depends on it.

## Evidence

Command:

```bash
cd life-os/apps/web && npm test
```

| Step | Result | Evidence |
| --- | --- | --- |
| Format | Pass | Prettier reports every matched file compliant. |
| Lint | Pass | `eslint . --max-warnings 0` reports zero problems. |
| Typecheck | Pass | `tsc --noEmit` passes under `strict`, `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`. |
| Module boundaries | Pass | `verify:boundaries` reports no crossing import, no missing public entrypoint, no non-`*Route` route export. |
| Design tokens | Pass | `verify:tokens` reports no raw color literal or `--palette-*` read outside `styles/tokens.css`. |
| Unit and accessibility tests | Pass | 358 Vitest tests across 21 files, including the new 64-specimen accessibility sweep (LOS-0332) covering every one of the 27 atom catalog entries. |
| Coverage | Pass | 97.01% statements, 94.08% branches, 95.81% functions, 97.13% lines — all above the 80% gate. |
| Test build | Pass | `vite build --mode test` succeeds; the catalog is confirmed excluded from the artifact by `tests/catalog-exclusion.test.mjs`. |
| Node integration assertions | Pass | 35 assertions across tokens, reset/global foundations, the local gateway proxy and module boundaries. |
| Total wall time | Pass | 8.2 s. |

## Catalog completeness

`catalog/registry.ts`'s `assertRegistryIsValid` runs on every catalog mount and fails loudly on a duplicate id or a stateless entry; `CatalogApp.test.tsx` exercises it directly. The registry currently holds **41 top-level entries and 106 registered states** across Foundations and Atoms. Every atom ticket from LOS-0304 through LOS-0330 has a catalog entry with at least its default, error/invalid and disabled states where the component has them, plus whatever states are specific to it (indeterminate, loading, indeterminate progress, reduced motion, forced colors documented in code rather than as a separate visual state).

## Frozen public API

The complete exported surface of `@components/ui` at this commit (`components/ui/index.ts`) is the frozen contract for Epic 04:

Foundational: `Icon`. Scales: `AVATAR_SIZES`, `BADGE_TONES`, `BUTTON_SIZES`, `BUTTON_VARIANTS`, `ICON_SIZES`, `PRIORITY_TONE`, `PROGRESS_SIZES`, `PROGRESS_TONES`, `SPINNER_SIZES`, `TASK_STATUS_TONE` and their types.
Navigation: `Link`. Status: `Badge`, `CountBadge`, `DecorativeStatusDot`, `StatusDot`. Identity: `Avatar`, `AvatarGroup`, `accentIndexForName`, `initialsForName`, `Logo`.
Actions: `Button`, `IconButton`. Typography: `Caption`, `Heading`, `Metric`, `Text`, `TruncatedText`.
Form controls: `Checkbox`, `RadioGroup`, `Switch`, `TextInput`, `PasswordInput`, `Textarea`, `Select`, `DateInput`, `TimeInput`, `NumberInput`, and the shared `Field` frame.
Progress and feedback: `ProgressBar`, `ProgressRing`, `readProgress`, `Spinner`, `Skeleton`, `SkeletonCard`, `SkeletonTable`, `SkeletonText`, `Divider`, `DividerList`, `DividerListItem`.
Accessibility helpers: `LiveRegion`, `VisuallyHidden`, `Tooltip`, `resolveTooltipPosition`.
Layout: `Surface`.

`hooks/useAnnouncer` and `lib/localDateTime` are also part of this freeze: composed components building a form field with a live region or a due date must use these rather than reimplementing them.

## Defects found and resolved

| Defect | Cause | Resolution | Regression evidence |
| --- | --- | --- | --- |
| Three form controls duplicated the field frame | `TextInput`, `PasswordInput` and `Textarea` (LOS-0314–0316) predate the shared `Field` component introduced in LOS-0317. | Migrated all three onto `Field`; deleted the now-unused `text-input.css`. | Pre-existing `formControls.test.tsx`/`dataEntry.test.tsx` suites pass unmodified against the refactored components. |
| `Button` duplicated `Spinner`'s animation | `Button`'s loading indicator (LOS-0306) predates `Spinner` (LOS-0323). | `Button` now renders `Spinner`; removed the duplicate keyframe from `button.css`. | `Button.test.tsx` passes unmodified plus two new assertions. |
| A loading button's accessible name fell back to its hidden busy text | Surfaced while merging `Button` onto `Spinner`: hiding the visible label with `aria-hidden` left nothing else to supply the name except the busy text, so "Save changes" became "Saving". | Pinned `aria-labelledby` to the still-present (only visually hidden) label span. | New `Button.test.tsx` case asserts the name stays "Save changes" while `loading`, and that "Saving" is separately available through `role="status"`. |

No unresolved critical or serious defect remains.

## Security, privacy and cleanup

- No secret, real personal data, or reference-product identity/data was introduced; `docs/validate-docs.mjs` and `verify:tokens` continue to pass across the full tree.
- No new dependency was added; the frozen `package.json`/lockfile from LOS-0203 is unchanged.
- No database, browser storage, network call, or production configuration was touched — this phase is presentation-only components with mocked/local state.

## Gate decision

Proceed to `LOS-0401 — Build FormField`, the first ticket of Epic 04 (`docs/backlog/EPIC-04-COMPOSED-COMPONENTS.md`). The public API listed above is frozen: a composed-component ticket that needs to change an atom's contract must record the change and its justification as an ADR per `docs/07-GIT-WORKFLOW.md`, not as a silent edit inside an unrelated ticket.

Outstanding, non-blocking follow-ups carried forward from LOS-0332: a real-browser accessibility pass (contrast, forced-colors, reduced-motion, 200% zoom) is recommended before any Epic 03 component is treated as production-verified rather than API-frozen.
