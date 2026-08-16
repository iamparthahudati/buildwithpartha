# buildwithpartha — Build Plan

Derived from `design_handoff_buildwithpartha/README.md` + the Classical design system,
reconciled against the existing repo. **Where the README and the prototype disagree, the README wins.**

## Locked decisions

| Decision | Choice |
| --- | --- |
| Nav variant | **masthead** |
| Feed layout | **magazine** |
| Tools directory | **plates** |
| Ad density | **balanced** (leaderboard + sidebar + mid-article) |
| Article measure | **cap prose at ~34em** (single column, not two-column) |
| Framework | **Keep existing vinext** (Vite + React 19 RSC, App Router layout, Cloudflare Workers) — do *not* scaffold fresh Next.js |

## Starting point (what's already here)

- vinext App-Router project deployed to Cloudflare Workers (`worker/index.ts`, `wrangler`).
- Tailwind v4 configured; **Drizzle + D1** wired (`db/`, `drizzle/`) — available for the newsletter endpoint.
- Only content today: a dark-theme "Coming soon" page (`app/page.tsx`, `app/globals.css`, Geist fonts in `app/layout.tsx`). **All three get replaced.**

---

## Stage 0 — Foundation

Goal: the Classical token sheet is live, fonts load, the coming-soon theme is gone. No pages yet.

- [ ] **Port the token sheet.** Copy the `:root` tokens + component layer from
  `design/_ds/classical-*/styles.css` into `app/globals.css` verbatim (tokens, ramps, `.btn/.tag/.card/.input/.seg/.table/.plate/.nav/.hr/.dialog`). Do **not** rewrite token values.
- [ ] **Delete** the coming-soon dark styles and the `@import "tailwindcss"` dark theme block. Tailwind is not needed (spec is token-driven); leaving it imported is fine as long as its preflight doesn't fight the token base — safest is to drop the Tailwind import for this design.
- [ ] **Fonts via `next/font/google`**, not the CSS `@import` (remove the `@import url(...fonts...)` line from the ported CSS to avoid double-loading):
  - Cormorant Garamond — weights **400, 600** → `--font-heading`
  - Lora — weights **400, 500** + **italic** → `--font-body`
  - Mono → `ui-monospace, SFMono-Regular, Menlo, monospace` (system stack, no webfont)
  - Wire the font CSS variables so `--font-heading`/`--font-body` resolve to the loaded faces.
- [ ] **Accessibility sizing:** define a base and express type sizes in **rem** (spec §Accessibility — must survive 200% zoom). Keep the px values from the type scale as the rem source of truth (px ÷ 16).
- [ ] **`::selection`, `:focus-visible` accent ring, tabular numerals** (`font-feature-settings:'tnum' 1`) on kickers/tables/prices/display numerals — **never** on running prose.
- [ ] Update `app/layout.tsx` metadata (title/description/OG) off "Coming Soon".

**Review gate:** render a throwaway page using `.btn`, `.card`, `.input`, a plate, and a heading — confirm it looks Classical (gold strokes, outlined buttons, no fills).

## Stage 1 — Layout shell

Goal: masthead nav + footer + full-width frame wrapping every page.

- [ ] **Page frame:** flex column (`nav → main flex:1 → footer`), `min-height:100vh`, **desktop-first `min-width:1240px`** (narrow viewports scroll, don't squeeze). Full-viewport-width content, gutter `padding: 0 clamp(20px,4vw,64px)`. Mobile is explicitly out of scope.
- [ ] **Masthead nav** (`components/Masthead`):
  - top row: 3 uppercase 12px items — date / `Issue NNN` / `Bengaluru`, `space-between`, letter-spacing 0.14em, neutral-600, tabular
  - wordmark **"buildwithpartha"** 62px centered, heading font, tagline 16px centered
  - hairline `border-top`, then centered nav row: **Home · Articles · Tools · Deals · Stack · About**, heading font 16px uppercase, `gap:30px`, active item via `aria-current` + accent underline
- [ ] **Footer** two tiers (upper: wordmark 22px + prose max 38ch + link columns; lower: `© 2026 Partha` + affiliate/advertising/no-tracking line, 12.5px neutral-600). Copy verbatim from README §Footer.

**Review gate:** shell renders on a blank home route, nav highlights current route, footer copy exact.

## Stage 2 — The eight tools *(priority)*

Goal: `/tools` directory + `/tools/[tool]` workspace, all eight tools fully working, **100% client-side, nothing ever sent anywhere**. This is the part to be strict about — match error messages and status lines exactly.

- [ ] Copy the `TOOLS` metadata array (id/num/name/short/desc) **verbatim** from `design/buildwithpartha.dc.html` (lines ~698–708). *(Extracted — reproduced at bottom of this file.)*
- [ ] **`/tools` directory** (plates layout): kicker "The workshop", h1 50px "Eight tools, no accounts, no uploads", 17px line ≤60ch, 220px search input "Search tools". Large hairline-parted rows: two-digit tabular number + heading-font name + one-line desc. Below: accent-bordered newsletter box.
- [ ] **`/tools/[tool]` workspace** (`'use client'`): tool-switcher rail (active = accent left border) + panes. Header: tool name 42px + desc 16px. Each pane = bordered surface with hairline header strip (label + controls). **Status line** under output, 14px, `aria-live="polite"` — every tool reports what it did. Copy button → transient "Copied", clears on next input change.
- [ ] Real `<label>`s on every input/textarea; `aria-label` on search + email fields.

Tool behaviors (recompute synchronously on input change; no submit buttons; no debounce):

| id | Behavior + exact status/error |
| --- | --- |
| `json` | `JSON.parse`→`JSON.stringify(v,null,indent)`; indent 0/2/4. Status `Valid JSON · N top-level keys` (`N items` array / `scalar`) `· N characters out`. Fail → raw `SyntaxError` message. |
| `regex` | `new RegExp(pattern, flags)` forcing `g`; iterate `exec`, cap 200, bump `lastIndex` on zero-length. Per match: index, text, offset, groups joined ` · ` (or `—`). Status `N matches in M characters` / `Invalid pattern: <message>`. |
| `base64` | axes kind(base64/url) × mode(encode/decode). base64: `btoa(unescape(encodeURIComponent(s)))` + inverse. url: `encodeURIComponent`/`decodeURIComponent`. Status names kind+direction+length; throw → `Not valid input for this mode: <message>`. |
| `jwt` | split `.`, require 3 parts, base64url-decode header+payload (`-`→`+`,`_`→`/`, re-pad). Output `// header`+json, blank, `// payload`+json. Status `Decoded · alg <alg> · signature not verified` (+`· expires <UTC>` if `exp`). **Never verify/transmit** — say so in UI. |
| `uuid` | 5× `crypto.randomUUID()`, each copyable, Regenerate action. |
| `diff` | two textareas, line-based LCS DP table, walk → `−`/`+`/nbsp rows. Removed = neutral tint, added = accent tint (**tints not fills**). Report added/removed counts. |
| `contrast` | fg/bg inputs (default `#7d5411` on `#f3f2f2`). WCAG relative luminance + ratio; grade AA 4.5, AAA 7, large-AA 3 with pass/fail. Live sample at body + large size. |
| `hash` | `crypto.subtle.digest` SHA-1/256/512, hex. **Async** — recompute on input/algo change. Fail → `Could not compute: <message>`. |

**Review gate:** verify each tool against the prototype, including error text. Confirm no network calls (check devtools).

## Stage 3 — Writing

- [ ] **`/` home** (magazine feed): two-col grid `minmax(0,1fr)` + **300px** sidebar, `gap:clamp(28px,4vw,60px)`, `padding:34px 0 56px`. Lead story (full-width plate, 52px headline, standfirst, byline) then hairline-parted secondary stories in two columns. Sidebar order: ad slot → newsletter capture (accent border) → "most read" → affiliate mini-unit.
- [ ] **`/articles/[slug]`** (MDX): 200px sticky contents rail + `minmax(0,1fr)` article. Kicker / h1 52px / standfirst 20px / byline row / hero plate 420px / **prose capped ~34em**, 19px, line-height 1.72, justified, `hyphens:auto` / code block on neutral-900 / inline affiliate unit / pull quote 33px / mid-article ad / end newsletter row. All exact values in README §2.
  - Set up MDX in vinext (or a lightweight frontmatter+MDX compile step). *Fallback if MDX is fiddly under vinext RSC:* store the seed article as a typed content module and render through the article template — swap to MDX later.
  - Seed with the prototype's article "I replaced Redis with UNLOGGED Postgres tables" (placeholder — validates the template).

## Stage 4 — Monetization + remaining pages

- [ ] **Single `AdSlot` component** (one abstraction, real network dropped in later). Variants: Leaderboard 728×90, Mid-article 728×90/120px container, Sidebar 300×250. Placeholder styling per README §Ad slots. **Every slot labelled "Advertisement".**
- [ ] **`/deals`** — kicker + h1 50px, intro ≤64ch, **always-on affiliate disclosure** (accent left-border), 4 bordered host-offer rows (name / plan / tabular price / honest reason / outlined CTA). Keep the "removed if it got worse" promise visible.
- [ ] **`/stack`** — grouped sections of items (name / role / why), affiliate links marked.
- [ ] **`/newsletter`** — centered `max-width:760px`, kicker + h1 60px + 19px line ≤52ch + email row + honest small print.
- [ ] **`/about`** — portrait plate 340px + contact links, text column ≤620px, justified bio.
- [ ] **Newsletter endpoint** — real validation + success state. Persist subscribers via existing **D1/Drizzle** (schema + a POST route/worker handler). One-click unsubscribe.

## Stage 5 — Polish & launch prep

- [ ] Interaction states from the design system only (no default blue ring anywhere).
- [ ] Source real images; run each through `.plate`. Lucide icons where needed.
- [ ] a11y pass: nothing below 11.5px, accent body-text uses `--color-accent-700`, aria-live status lines, 200% zoom holds.
- [ ] Replace placeholder article/deals/stack copy with final content (voice: first person, specific numbers, no hype).
- [ ] Deploy via existing Wrangler/Cloudflare pipeline; verify OG image + favicon.

---

## Open items needing your input later

- **Ad network** (fills `AdSlot`) and **newsletter provider** (or self-host on D1 — schema's already here).
- Real photography (none exists yet) and final article/deals/stack copy.
- MDX-under-vinext: confirm the toolchain supports it, else use the typed-content fallback.

## Route map

```
/                    home / magazine feed
/articles/[slug]     long-form article (MDX)
/tools               directory (plates)
/tools/[tool]        workspace — 8 tools, browser-only
/deals               affiliate offers
/stack               what the site runs on
/newsletter          subscribe
/about               bio + contact
```

## TOOLS metadata (verbatim — copy into code)

```js
const TOOLS = [
  { id: 'json',     num: '01', name: 'JSON Formatter',        short: 'Validate and pretty-print',    desc: 'Validate, pretty-print or minify. Errors point at the character that broke it.' },
  { id: 'regex',    num: '02', name: 'Regex Tester',          short: 'Patterns, flags, groups',       desc: 'Run a pattern over a subject and read every match with its capture groups.' },
  { id: 'base64',   num: '03', name: 'Base64 & URL Encoder',  short: 'Encode and decode both ways',   desc: 'Base64 or percent-encoding, in either direction, on text of any length.' },
  { id: 'jwt',      num: '04', name: 'JWT Decoder',           short: 'Header, payload, claims',       desc: 'Split a token and read its header and payload. Nothing is verified or sent anywhere.' },
  { id: 'uuid',     num: '05', name: 'UUID Generator',        short: 'Version 4, five at a time',     desc: 'Version 4 identifiers drawn from the browser cryptographic random source.' },
  { id: 'diff',     num: '06', name: 'Diff Checker',          short: 'Line-by-line comparison',       desc: 'Compare two texts line by line and see exactly what moved, went or arrived.' },
  { id: 'contrast', num: '07', name: 'Colour Contrast',       short: 'WCAG ratio and grades',         desc: 'The contrast ratio for a foreground and background pair, graded against WCAG.' },
  { id: 'hash',     num: '08', name: 'Hash Generator',        short: 'SHA-1, SHA-256, SHA-512',       desc: 'Digests of any text, computed in the page by the browser crypto API.' },
];
```
