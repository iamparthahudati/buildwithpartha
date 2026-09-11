# 48 — Browser Support Policy and Responsive/Browser Matrix

Last updated: 2026-09-11 (LOS-1504)

---

## 1. Executive Summary

LifeOS targets the **current stable release** of every Tier-1 browser on both desktop and mobile form factors. All Tier-1 browsers must render every route without horizontal overflow at any declared breakpoint, process design tokens correctly, and complete the primary task-creation interaction without console errors or visual breakage.

---

## 2. Browser Tier Classification

### Tier 1 — Fully Supported (blocking)

All Tier-1 browsers are tested in CI. A regression in any Tier-1 target is a launch blocker.

| Browser | Engine | Desktop | Mobile / Tablet |
| --- | --- | --- | --- |
| Chrome (current stable) | Blink / V8 | ✅ | ✅ Android (Pixel 5) |
| Firefox (current stable) | Gecko / SpiderMonkey | ✅ | ✅ Narrow viewport |
| Safari (current stable) | WebKit / JavaScriptCore | ✅ macOS | ✅ iOS (iPhone 14) |
| Edge (current stable) | Blink / V8 | ✅ | — |

### Tier 2 — Best-Effort (non-blocking)

Tested manually or via automated smoke only. Failures generate issues but do not block release.

| Browser | Engine | Notes |
| --- | --- | --- |
| Samsung Internet (current) | Blink | Android OEM |
| Chrome for iOS (current) | WebKit (forced by iOS) | Same engine as Safari |
| Firefox for iOS (current) | WebKit (forced by iOS) | Same engine as Safari |
| Brave (current) | Blink | Chromium-derivative |

### Tier 3 — Explicitly Unsupported

| Browser | Reason |
| --- | --- |
| Internet Explorer (all versions) | EOL since June 2022; no ES Modules support |
| Legacy Edge (EdgeHTML) | EOL since March 2021 |
| Opera Mini (Extreme mode) | Proxy-rendered; JavaScript disabled |
| Any browser older than N-1 stable | Below the project's browserslist target |

---

## 3. Supported Viewport Breakpoints

All breakpoints are tested via automated Playwright browser matrix spec (`e2e/browser-matrix/browser-matrix.spec.ts`). Zero horizontal overflow is required at all breakpoints.

| Breakpoint | Width | Representative Device | Tier |
| --- | --- | --- | --- |
| WCAG Reflow (1.4.10) | 320 px | Smallest practical phone | Required |
| Small Mobile | 375 px | iPhone SE / Galaxy A-series | Tier 1 |
| Large Mobile | 414 px | iPhone Pro Max | Tier 1 |
| Tablet Portrait | 768 px | iPad / Galaxy Tab | Tier 1 |
| Tablet Landscape | 1024 px | iPad landscape | Tier 1 |
| Desktop | 1280 px | Laptop | Tier 1 |
| Wide Desktop | 1440 px | External monitor | Tier 1 |

---

## 4. CSS Baseline and Feature Policy

### Required CSS features (all Tier-1 browsers must support)

| Feature | Status |
| --- | --- |
| CSS Custom Properties (variables) | Required — LifeOS design tokens depend on this |
| CSS Grid | Required |
| CSS Flexbox | Required |
| `focus-visible` pseudo-class | Required (polyfilled if absent) |
| `@media (prefers-reduced-motion)` | Required |
| `@media (forced-colors)` | Required |
| CSS `mask` property | Required (progress ring) |
| `dvh` / `svh` units | Best-effort (fallback to `100vh`) |
| CSS Anchor Positioning | Not used in v1 |
| `:has()` selector | Not used in v1 |

### JavaScript baseline

| Feature | Requirement |
| --- | --- |
| ES2022 (including top-level `await`) | Required |
| ES Modules (`<script type="module">`) | Required |
| `ResizeObserver` | Required |
| `IntersectionObserver` | Required |
| `IndexedDB` (for offline draft storage) | Required |
| `navigator.serviceWorker` | Required for offline shell; graceful degradation if absent |
| `Crypto.subtle` | Required for offline queue encryption |

---

## 5. Browserslist Target

The Vite build configuration targets browsers via the `browserslist` query:

```
last 2 Chrome versions
last 2 Firefox versions
last 2 Safari versions
last 2 Edge versions
```

This ensures the compiled bundle does not rely on features unavailable in any Tier-1 browser's N-1 stable release.

---

## 6. Known Cross-Browser Inconsistencies and Remediations

### 6.1 Safari WebKit — `backdrop-filter` Performance

**Observed behaviour:** `backdrop-filter` on glassmorphism overlays causes occasional GPU layer promotion jank in Safari on lower-end devices.
**Severity:** Non-blocking (cosmetic).
**Mitigation:** `@supports (backdrop-filter: blur(1px))` guard is applied; unsupported browsers fall back to a solid surface background.
**Status:** Accepted as Tier-2 limitation; tracked for v1.1 optimisation.

### 6.2 Firefox — CSS `mask` shorthand syntax

**Observed behaviour:** Firefox <126 required vendor-prefixed mask syntax for SVG-based icon masks.
**Severity:** Resolved. Minimum Firefox target is current stable; all mask usage is tested in Playwright Firefox project.
**Status:** No action required.

### 6.3 Firefox — `scrollbar-width: thin`

**Observed behaviour:** Firefox renders thin scrollbars natively via `scrollbar-width: thin`. Chrome and Safari apply custom scrollbar styles via `::-webkit-scrollbar`. The visual appearance differs slightly between browsers.
**Severity:** Non-blocking (cosmetic).
**Status:** Accepted cross-browser variation. LifeOS applies `scrollbar-width: thin` globally and provides `::-webkit-scrollbar` rules for Blink/WebKit.

### 6.4 iOS WebKit — `position: fixed` with virtual keyboard

**Observed behaviour:** When the software keyboard is open on iOS, `position: fixed` elements may be obscured or shift upward unexpectedly.
**Severity:** Non-blocking in v1 (no fixed-position input surfaces in critical paths).
**Mitigation:** Modal dialogs use `position: fixed` with `inset: 0` and `overflow: auto`; tested on `iPhone 14` Playwright profile.
**Status:** Monitored. If a critical-path input surface is introduced, revisit using `env(safe-area-inset-*)` and `dvh`.

### 6.5 Edge — Same-engine as Chrome

Edge Stable uses the Chromium engine. Any Chrome pass in CI is an implicit Edge pass for JavaScript/CSS behaviour. The dedicated `desktop-edge` Playwright project validates user-agent-specific differences (Edge-specific DevTools APIs, SmartScreen referrers, etc.).

---

## 7. Browser Matrix Test Coverage

The automated browser matrix is implemented in `life-os/apps/web/e2e/browser-matrix/browser-matrix.spec.ts` and runs across all Playwright project targets defined in `playwright.config.ts`.

### Test areas

| Area | Spec Section | Assertion |
| --- | --- | --- |
| Public route rendering | Section 1 | No horizontal overflow; design tokens resolved |
| Authenticated shell | Section 2 | `#lifeos-main-content` visible; no overflow |
| Touch target sizing | Section 3 | All interactive controls ≥ 44×44 CSS px on viewports ≤ 600 px wide |
| Quick-add interaction | Section 4 | No JS console errors during task creation flow |
| Service Worker registration | Section 5 | No SW-related console errors |
| Viewport breakpoints | Section 6 | No overflow at 320/375/768/1024/1280/1440 px widths |
| HTML lang and page titles | Section 7 | Non-empty `<title>` and `html[lang]` on all routes |

### Playwright project matrix

| Playwright Project | Browser Engine | Viewport |
| --- | --- | --- |
| `desktop-chromium` | Chromium (Chrome) | 1280×800 |
| `mobile-chromium` | Chromium (Chrome) | 375×667 (Pixel 5) |
| `desktop-firefox` | Gecko (Firefox) | 1280×800 |
| `mobile-firefox` | Gecko (Firefox) | 375×667 narrow |
| `desktop-webkit` | WebKit (Safari) | 1280×800 |
| `mobile-webkit` | WebKit (Safari/iOS) | iPhone 14 |
| `desktop-edge` | Chromium (Edge) | 1280×800 |
| `tablet-chromium` | Chromium | 800×1280 |

---

## 8. Update Policy

This document must be updated whenever:

1. A new browser major version drops a feature that LifeOS depends on.
2. A new CSS or JS API is introduced into the codebase.
3. A new Playwright browser project is added to or removed from `playwright.config.ts`.
4. A blocking cross-browser inconsistency is discovered and remediated.
5. The browserslist target query is modified.

Reviews are scheduled after each major Chrome, Firefox, and Safari stable release.

---

## 9. Responsibility

| Role | Responsibility |
| --- | --- |
| Owner (Partha Hudati) | Approve and publish this document; unblock release on Tier-1 failures |
| Frontend engineering | Maintain browserslist target; write browser-specific mitigations |
| QA | Run and interpret automated browser matrix; file issues for Tier-2 regressions |
