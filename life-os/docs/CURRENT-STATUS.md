# Current status

Last updated: 2026-08-17

## Phase

Phase 1 — Foundations and component library.

## Completed

- LOS-0001 — Project charter approved by the owner on 2026-08-16.
- LOS-0002 — Permanent product context approved on 2026-08-16.
- LOS-0003 — Local/remote `master` and `develop` branch foundation established without changing or deleting `main`; LOS-0212 completed remote protection.
- LOS-0004 — Contribution guide, pull-request/ticket templates and LifeOS ownership rules added.
- LOS-0005 — Backlog workflow, readiness gate, priorities/estimates and status ledger established.
- LOS-0006 — ADR template, decision triggers, review and supersession workflow established.
- LOS-0007 — Semantic version tags, changelog and release-note/rollback evidence template established.
- LOS-0008 — Local, CI, staging and production environment/data/secrets separation and ownership documented.
- LOS-0009 — Documentation/link/ticket/freshness validator is enforced by the hosted CI foundation.
- LOS-0010 — Epic 00 governance gate passed and its permanent-branch enforcement prerequisite is complete.
- LOS-0101 — Owner-centered personas, accessibility situations and ranked jobs-to-be-done established with a usage-validation plan.
- LOS-0102 — Required v1, optional gated capabilities and explicit future scope frozen.
- LOS-0103 — Connected LifeOS loop, canonical destinations, relationships and naming approved.
- LOS-0104 — Canonical route map and desktop/tablet/mobile navigation, auth return, Back and unsaved-change behavior approved.
- LOS-0105 — Main-site/LifeOS isolation accepted and eight critical journeys mapped with recovery behavior.
- LOS-0106 — Resumable four-step onboarding defined with required timezone, optional preferences and no fake starter data.
- LOS-0107 — Today information hierarchy, metric definitions, widget source/state contracts and responsive order approved.
- LOS-0108 — Daily, weekly and monthly review rituals, snapshots, skip/resume and neutral copy approved.
- LOS-0109 — Responsive route-complete low-fidelity wireframes and shared UI state patterns approved.
- LOS-0110 — Seven critical interactions prototyped with responsive, accessible and recovery paths; implementation risks assigned.
- LOS-0111 — Canonical UI/code/API/database vocabulary, statuses, priorities, labels and action verbs approved.
- LOS-0112 — Content voice, validation/state/destructive/review language, localization rules and original fixture policy approved.
- LOS-0113 — Personal-data inventory, purposes, classifications, retention, consent/notice, export/deletion, logging, backup, email, provider, optional file and future AI lifecycle baseline completed with official-source review.
- LOS-0114 — Product/UX phase gate passed with owner sign-off; the complete scope, information architecture, journeys, wireframes, interaction, language and privacy baseline is approved for engineering foundations.
- LOS-0201 — Standalone React 19.2.8/TypeScript 7.0.2/Vite 8.2.1 application bootstrapped with strict typing, `/life-os/` development/production base, explicit browser target, temporary readiness view and nested-asset build test.
- LOS-0202 — Java 21/Spring Boot 4.1.0 API bootstrapped with a checksummed Gradle 9.5.1 wrapper, required web/security/JPA/Flyway/mail/actuator/PostgreSQL dependencies, safe external configuration and a self-contained context test.
- LOS-0203 — Cross-stack dependency resolution locked with exact npm declarations/lockfile, strict Gradle transitive lock state, a checksummed wrapper, automated weekly update proposals, validation and a controlled security override path.
- LOS-0204 — Disposable local PostgreSQL 18.4 Compose service defined with loopback-only port `55432`, a named volume, private network, health check, separate non-superuser application role and scoped reset guidance.
- LOS-0205 — Forward-only Flyway baseline added with private checksum history, disabled automatic baseline/clean, the trusted `pgcrypto` extension, separate migration/runtime roles and clean/existing PostgreSQL verification.
- LOS-0206 — Enforceable backend boundaries added for approved domain packages, inward `api`/`application`/`domain`/`infrastructure` dependencies, domain-neutral error/pagination contracts and negative architecture-test fixtures.
- LOS-0207 — Frontend module boundaries established with public feature/component entrypoints, synchronized TypeScript/Vite aliases, restricted feature layouts and a test gate that rejects private feature imports and route-local UI components.
- LOS-0208 — Frontend quality baseline added with Prettier, zero-warning ESLint, strict typechecking, Vitest, Testing Library/user-event helpers, axe accessibility checks and enforced 80% V8 coverage.
- LOS-0209 — Backend quality baseline added with Spotless/google-java-format, Checkstyle, explicit JUnit/AssertJ/Testcontainers support, existing ArchUnit enforcement and an 80% JaCoCo line/branch coverage gate.
- LOS-0210 — Vite development/preview same-origin gateway added with exact `/life-os/api` proxy matching, unchanged API paths and live tests proving API routing precedes nested SPA fallback.
- LOS-0211 — Frontend and backend startup validation added for required public/runtime configuration, with deterministic test profiles, safe local examples and errors limited to missing/invalid key names.
- LOS-0212 — Four-check GitHub Actions foundation added with pinned actions, safe lock-scoped caches, frontend/backend builds, full-history secret scanning and enforced protection/default-branch settings for `develop` and `master`.
- LOS-0213 — Versioned safe API Problem Details, validated response correlation IDs, aggregate liveness/readiness and deny-by-default actuator access added with tests proving diagnostic and rejected-value data cannot leak.
- LOS-0214 — Authenticated OpenAPI 3.1 baseline added with the versioned server, session/CSRF notes, reusable safe problems and pagination schema; backend tests validate and publish the empty-first contract as a retained CI artifact.
- LOS-0215 — Deterministic frontend/backend User, Project, Task and time builders added with fixed safe identities/instants, immutable or isolated overrides, canonical statuses and tested IANA timezone date boundaries.
- LOS-0216 — Engineering foundation gate passed from a fresh clone in 34 seconds: locked install, documentation/CI policy, frontend, uncached backend, PostgreSQL migration, API readiness and nested SPA route passed after fixing two clean-environment regressions.
- LOS-0301 — Semantic color, typography, spacing, radius, border, shadow, z-index, motion, breakpoint, density and chart tokens frozen in a private-palette/semantic two-layer contract, with every rendered pairing proven against WCAG 2.2 AA, rem-only scales for 200% zoom, reduced-motion and 44px touch guarantees, and an enforced rule that no file outside the token file may contain a raw color.
- LifeOS product boundary and production URL recorded.
- Reference screens analyzed as interaction/layout guidance.
- React/Java/PostgreSQL/VPS/Cloudflare architecture selected.
- Permanent shared context, Git workflow, security baseline, definition of done, and component-first rule created.
- A 52-section product specification covers every requested product, engineering, UX, quality, and future area.
- Component-to-screen dependency map and release QA acceptance matrix created.
- Eighteen epics and 315 uniquely named tickets created with outcomes, acceptance contracts, and dependencies.

## Not started

- No authentication implementation, product domain tables, product components/screens, VPS configuration, Cloudflare configuration, or production resources have been created.

- LOS-0302 — Token-driven CSS reset and global foundations added: normalized box sizing, form typography and media without erasing native list, heading or control semantics; a single `:focus-visible` ring; selection, reduced-motion, forced-colors and increased-contrast hooks; and a skip link that stays focusable, is the first tab stop and moves real focus to a `tabindex="-1"` main landmark.
- LOS-0303 — Development-only component catalog added: a registry that fails loudly on duplicate or stateless entries, per-state specimens for the frozen foundations, and viewport controls that start at the 320px minimum. It is excluded from every production build rather than protected at runtime, with a runtime guard as a second line of defense.
- LOS-0304 — Single `Icon` wrapper added over the approved icon set (lucide-react, ADR-013): named rem sizes that scale with text, a decorative-versus-labelled contract enforced by the type signature, and per-icon imports so a screen ships only the icons it renders.
- LOS-0305 — Heading, Text, Caption, Metric and TruncatedText added. Visual size is a separate prop from heading level so appearance never forces a broken outline; tabular numerals are opt-in for values that change in place; truncation clips visually while leaving the full string in the DOM.
- LOS-0306 — Button added with primary/secondary/ghost/danger/link variants, three sizes and decorative icon slots. Loading keeps the button's width and its place in the tab order, announces itself through `aria-busy`, and blocks a duplicate submit.
- LOS-0307 — IconButton added on top of Button with a required `label`, so an icon-only control without an accessible name fails typechecking rather than review; touch targets stay at 44px at every size.
- LOS-0308 — `Link` added for navigation only, with current-destination, external and quiet variants. It has no `disabled` prop by design: a disabled anchor loses its link role and its tab stop without explaining why, so an unavailable destination renders as text and an action renders as a button.
- LOS-0309 — Badge, StatusDot and CountBadge added. Every badge renders text, so colour accompanies meaning rather than carrying it; canonical Task status and Product priority tones are mapped from the vocabulary instead of chosen per call site, and a count badge names what it counts while announcing the exact number it visually clamps.
- LOS-0310 — Avatar and AvatarGroup added with image, initials, broken-image fallback and overflow states. The accent colour is hashed from the name, so a person keeps the same colour everywhere without anything being stored, and initials are taken by code point so emoji and astral characters are never split.
- LOS-0311 — Checkbox added as a real native input with a real label, so keyboard activation, form participation and the label relationship are the browser's rather than re-implemented. The mixed state is set as a DOM property because it cannot be expressed as an attribute, and description and error are both linked with the error announced first.
- LOS-0312 — RadioGroup added using a real fieldset, legend and shared input name, so arrow-key movement, the single roving tab stop and the one-selection rule all come from the browser rather than from script. Options carry their own descriptions; the error belongs to the group.
- LOS-0313 — Switch added for settings that take effect immediately, announced as on/off through `role="switch"` on a native checkbox. A toggle in flight refuses a second change so it cannot race itself, and the pending state is announced rather than only shown.
- LOS-0314 — TextInput added with a real bound label — never a placeholder standing in for one — plus prefix/suffix adornments, a clear action kept out of the tab order because the keyboard already has that capability, error/success/read-only/disabled states, and pass-through mobile keyboard and password-manager attributes.
- LOS-0315 — PasswordInput added with a reveal toggle that reports itself as pressed and returns to concealed on every mount, a politely announced Caps Lock hint, `new-password` versus `current-password` autocomplete so password managers offer to generate or fill correctly, and a help slot for a strength meter that never receives the value and therefore cannot leak it.
- LOS-0316 — Textarea added. Auto-growing uses the `field-sizing` CSS property instead of measuring scroll height on every keystroke, so there is no resize observer to keep in sync. The character counter counts code points, so an emoji is one character, and it warns rather than setting `maxLength` — silently truncating a paste would lose the user's text without telling them.

- LOS-0317 — Select added as a real native `select`. A custom listbox would re-implement type-ahead, Home/End and the platform's touch picker and still not be the control the device knows how to render, so it stays deferred. The placeholder is selectable on an optional field, so a choice can be undone, and disabled on a required one, because "no answer" is not one of the answers. A shared `Field` frame now owns label, description, error and success wiring for the new controls.
- LOS-0318 — DateInput added. The value is a calendar date and stays a `YYYY-MM-DD` string end to end; putting it through a `Date` would attach a time of day and move the deadline a day for anyone whose timezone differs from their browser's. `lib/localDateTime.ts` is the only place allowed to read today from a timezone, do calendar arithmetic, or format a date-only value.
- LOS-0319 — TimeInput added. The platform renders a 12- or 24-hour field according to its own locale setting while exchanging canonical `HH:mm` either way, so display can be as local as the user likes without the stored value ever becoming ambiguous.
- LOS-0320 — NumberInput added with bounds, step and an announced unit rather than a silently visual one. Scrolling the page over a focused number field silently changes its value in most browsers; a non-passive wheel listener removes that without stealing focus, which is what the usual `blur()` workaround costs.

- LOS-0321 — ProgressBar added. It reports a real measurement or none at all: an indeterminate bar carries no `aria-valuenow`, because reporting zero would say the work has not started rather than that its end is unknown. The shared reading rounds so that only a true zero reads as 0% and only a true one reads as 100%, so a bar never claims a list is finished while work remains in it.
- LOS-0322 — ProgressRing added on the same reading, so a ring and a bar showing one metric cannot disagree. The arc is a single conic gradient driven by one custom property, with zero and full handled explicitly so an empty ring shows no arc and a complete one closes without a seam.
- LOS-0323 — Spinner added with a required label carried as live-region content. A spinner says only that something is happening, so it never replaces the waiting copy a region needs, and an unlabelled one is a type error.
- LOS-0324 — Skeleton added for text, card and table shapes. Its job is to stop the page moving under the user's pointer when data arrives; every shape is hidden from assistive technology, because announcing a dozen placeholders buries the one message that matters.
- LOS-0325 — Divider added, silent by default. Most rules repeat a grouping that headings and list structure already carry, so the separator role is taken only when the line itself is the boundary.

- LOS-0326 — Tooltip added. Its content is typed as plain text, because a control inside a tooltip can be seen but, for most people, never reached. Hover waits so a pointer crossing a toolbar does not flash five tooltips; focus opens at once; Escape closes it and latches it shut while the pointer is still there, without swallowing the key from a dialog above. Collision handling is a pure function, so flipping and clamping are tested without a layout engine.
- LOS-0327 — VisuallyHidden, LiveRegion and `useAnnouncer` added. The live region is always mounted, because one that appears together with its text is frequently never announced. The announcer publishes the first message immediately and coalesces the rest, so a filter panel or a running timer cannot turn a live region into a stream of interruptions.
- LOS-0328 — Original LifeOS wordmark, symbol and lockup added in `currentColor` and `em` units, so a mark inherits the colour and size of whatever names it. A bare symbol's label names the destination rather than the picture, and a test proves no reference-product name can reach the output.
- LOS-0329 — Surface card primitive added. `interactive` is styling only: a clickable `div` reaches no keyboard and a button inside a button is invalid, so the card follows the focus of the real control inside it. A `section` becomes a landmark only when it has a title, because an unnamed region is worse than none.
- LOS-0330 — DividerList added, drawing separators as a border on each row rather than an element between rows. A list whose children alternate between `li` and a decorative `div` is invalid and makes assistive technology report the wrong item count.

- LOS-0331 — Atom visual/structural audit passed. `TextInput`, `PasswordInput` and `Textarea` were migrated onto the `Field` frame LOS-0317 introduced after they shipped, and `Button` now composes `Spinner` instead of duplicating its animation. Migrating `Button` surfaced a real accessible-name bug — a loading button's name was falling back to its hidden busy text — which was fixed and regression-tested in the same ticket.
- LOS-0332 — Atom accessibility audit passed. A new 64-specimen sweep runs axe across every registered atom catalog entry composed together, the way the catalog actually renders them, and found zero violations; touch target, reduced-motion and forced-colors coverage were checked stylesheet by stylesheet.
- LOS-0333 — Atom phase gate passed (`docs/gates/ATOM-PHASE-GATE.md`): full quality suite green in 8.2 seconds (358 Vitest tests, 97%+ coverage, 35 Node assertions), 41 catalog entries covering 106 states, and the public export surface of `components/ui` (plus `hooks/useAnnouncer` and `lib/localDateTime`) is frozen for Epic 04 composed-component work.

- LOS-0401 — FormField added, the first Epic 04 ticket. It composes an atom through a render prop rather than cloning it, because every atom requires its own `label` as a real checked prop and a clone-based wrapper cannot satisfy that without forcing callers to write a throwaway label. `FormFieldGroup`/`FormErrorSummary` add the error-summary pattern the tone guide requires — the summary renders nothing until the caller has something to show it, and takes focus only when the caller's own submit handler calls it, never during ordinary typing. `lib/serverErrors.ts` maps the backend's `{ field, code }` validation shape to a per-field lookup without guessing at a message, since the same code means different approved copy on different fields.

- LOS-0402 — SearchField added, composing TextInput with a `useSearchField` hook that owns only the *timing* of when to search — debounced-after-a-pause or submit-only, with Enter always searching immediately and IME composition correctly held off so an intermediate, not-yet-real character is never searched. A single-key shortcut focuses the field except while another editable element already has focus. The loading state is announced through a real sibling live region rather than nested inside the decorative icon, since an `aria-hidden` wrapper would have swallowed `Spinner`'s own status role.

- LOS-0403 — Combobox added, following the ARIA 1.2 combobox-with-listbox pattern where focus never leaves the input and `aria-activedescendant` tracks the keyboard's current option instead. Two real accessibility bugs surfaced and were fixed during the axe sweep: a listbox with zero option children (the loading and no-results states) fails `aria-required-children`, so `role="listbox"` is now applied only once the list actually owns an option; and once it stopped being a listbox in that state, its status rows could no longer carry `role="presentation"` either, since that breaks a *plain* list's own required content just as badly. Multi-select stays open after each pick — closing would undo the point of choosing more than one — and each chip's dismiss button is a normal tab stop, because there is no keyboard equivalent for removing one arbitrary chip the way there is for clearing a whole text field. `fieldIds` was additively exported from `components/ui` so `Combobox` did not have to rebuild the same id-generation helper every other field-shaped atom already uses.

- LOS-0404 — DateRangeField added, grouping two DateInputs under one fieldset and legend the way RadioGroup groups related radio inputs. The end-before-start check is computed by the component itself rather than left to every caller to word — the rule is universal to any date range, unlike a required-field message — and is enforced structurally too: each side constrains the other's native `min`/`max` on top of the message. Presets stay a mechanism (`{ label, range }`) rather than a hard-coded policy, matching the "no domain columns hardcoded" principle DataTable's ticket already states; `buildCommonDateRangePresets` ships a ready-made set in its own module so the plain function doesn't break Fast Refresh by sharing a file with the component.

## Next recommended ticket

`LOS-0405 — Build DateTimeField`.

## Known decisions requiring implementation-time values

- SMTP provider and sending domain.
- Final VPS OS/CPU/RAM/storage and deployment user.
- Cloudflare zone access method and origin certificate/tunnel choice.
- Backup destination and retention policy.
- Legal operator/controller name, privacy/grievance contact and approved launch geography.
- ADR-012 accepts adults-only, India-first, 24-hour export, 30-day deletion-grace and 35-day backup-expiry engineering defaults; final privacy/legal applicability and provider review remains required before production.
