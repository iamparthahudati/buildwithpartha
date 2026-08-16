# 02 — Component Build Order (Frontend, smallest pieces first)

This is the doc that answers "build from very small small components so everything is in my understanding."
We build the UI **bottom-up**: the tiniest pieces first, each one built and *looked at in isolation*, then
combined into bigger pieces, then into pages. Nothing bigger is built until its parts exist and are understood.

## The mental model: atoms → molecules → organisms → pages

| Level | Meaning | Examples here |
| --- | --- | --- |
| **Atom** | Smallest piece. Can't be usefully broken down. | Button, Tag, Kicker, TextInput, Plate, Hr, NavItem |
| **Molecule** | A few atoms doing one job together. | SearchInput (label+input), Pane (border+header strip), CopyButton, NewsletterForm |
| **Organism** | A whole section of a page. | Masthead, Footer, ToolWorkspace, ArticleBody, HomeFeed |
| **Page** | A route, composed of organisms. | `/`, `/tools`, `/tools/[tool]`, `/articles/[slug]`, `/deals` … |

You asked to do the header this way: **first the pieces of the header (Wordmark, NavItem, Kicker), then
the header itself (Masthead), then the header in place (in the layout).** That is exactly the ladder below.

## The workshop: `/styleguide`

Before building any page, create a dev-only route **`/styleguide`**. Every component gets rendered there,
in every state, as you build it. This is your workbench — you see each small piece on its own before it's
ever used in a real page. (Think of it as a lightweight Storybook without extra tooling; you can add
Storybook later if you want.)

## The build recipe (do this for **every** component)

1. **Make the file** — `web/components/<Name>.tsx`. One component per file.
2. **Props** — the smallest set of inputs it needs. Type them. No hidden globals.
3. **Markup** — plain semantic HTML using the design-system class (`.btn`, `.card`, …). No new colors/sizes; only tokens.
4. **States** — hover, focus-visible (accent ring), pressed, disabled, and (if relevant) active/current.
5. **Accessibility** — real `<label>`, `aria-*` where needed, keyboard reachable, meets contrast (doc 4/5).
6. **Show it** — add it to `/styleguide` in all its states and look at it.
7. **(Tools only) test it** — pure logic gets a unit test (doc 4 §Testing).
8. **Done** — only now is it allowed to be used by something bigger.

---

## Order of build (this is the checklist)

### Group A — Atoms (Phase 2)

Build in this order. Each is tiny; each ends up in `/styleguide`.

1. **`Wordmark`** — the text mark "buildwithpartha", heading font. Props: `size`, `as` (h1/span/a). Used by Masthead + Footer.
2. **`Kicker`** — uppercase eyebrow label. Props: `children`, `tone` (accent-700 | neutral-600). Tabular numerals when it carries a number.
3. **`Button`** — wraps `.btn`. Props: `variant` (primary|secondary|ghost|icon), `block`, `disabled`, `as` (button|a), `onClick`/`href`. All states from the design system.
4. **`Tag`** — wraps `.tag`. Props: `variant` (accent|neutral|outline).
5. **`TextInput` + `Field`** — `Field` = `<label>` + `TextInput`. Never a bare placeholder-as-label. Props: `label`, `id`, `type`, `value`, `onChange`, `aria-describedby`.
6. **`SearchInput`** — `TextInput type=search` + `aria-label`. Used by the tools directory.
7. **`Segmented`** — wraps `.seg`/`.seg-opt` (radio group under the hood). Props: `options`, `value`, `onChange`, `name`. Used by tools (indent, mode, algorithm…).
8. **`Card`** — wraps `.card` with `.card-kicker/.card-title/.card-body/.card-meta` slots.
9. **`Plate`** — image mat wrapper (`.plate`). Props: `src`, `alt` (**required**), `width`, `height`. Enforces alt for a11y/SEO.
10. **`Hr`** — hairline divider (`.hr`).
11. **`NavItem`** — one nav link. Props: `href`, `current`. Sets `aria-current="page"` + accent underline when current.
12. **`AdSlot`** — the single ad abstraction. Props: `slot` (leaderboard|midArticle|sidebar). Renders the labelled "Advertisement" placeholder now; later renders the stored network snippet. **Always** labelled.
13. **`CopyButton`** — Button + clipboard write + transient "Copied" (resets on next input change). Props: `getText`, `resetKey`.
14. **`StatusLine`** — `aria-live="polite"` line under a tool's output. Props: `children`. Every tool reports through this.

### Group B — Molecules (Phases 3–4)

15. **`Pane`** — a bordered surface with a hairline header strip (label + controls slot) and a body slot. The building block of every tool workspace.
16. **`ToolRail`** — the 8-tool switcher list; active item = accent left border. Built from `NavItem`-like links.
17. **`NewsletterForm`** — `Field`(email) + `Button` + client validation + success/error state. Posts to `POST /api/newsletter/subscribe`. Reused on home sidebar, `/tools`, article end, `/newsletter`.
18. **`ContentsRail`** — the sticky article table-of-contents (active section = accent left border).
19. **`AffiliateUnit`** — the inline "what this runs on" unit (Plate + Kicker + title + body + Button), with disclosure.
20. **`FeedItem`** — one story row/card in the home feed (Plate thumb + Kicker + title + summary + meta).

### Group C — Organisms (Phases 3, 4, 6)

21. **`Masthead`** ← Wordmark + Kicker (meta row) + NavItem ×6. *(This is your "header": pieces first, then assembled here.)*
22. **`Footer`** ← Wordmark + link columns + fine print (two tiers).
23. **`ToolDirectory`** ← Kicker + heading + SearchInput + plate rows built from `TOOLS`. *(This is "how to show all the tools".)*
24. **`ToolWorkspace`** ← ToolRail + Pane(s) + StatusLine + CopyButton; hosts one active tool.
25. **`HomeFeed`** ← lead `FeedItem` + secondary `FeedItem`s + sidebar (AdSlot + NewsletterForm + most-read + AffiliateUnit).
26. **`ArticleBody`** ← ContentsRail + prose (capped ~34em) + Plate hero + AffiliateUnit + pull quote + AdSlot + NewsletterForm.
27. **`DealsList`**, **`StackList`**, **`AboutPanel`** — the remaining content organisms.

### Group D — Pages (compose organisms + wire data + SEO)

28. `layout.tsx` (Masthead + Footer + PageFrame) → then `/`, `/tools`, `/tools/[tool]`, `/articles/[slug]`, `/deals`, `/stack`, `/newsletter`, `/about`.

---

## Worked example: the header, exactly as you described

**Step 1 — the smallest pieces.**
- `Wordmark` — render "buildwithpartha" in the heading font. View it in `/styleguide` at 22px, 25px, 62px.
- `NavItem` — one link; give it a `current` prop; view it normal, hover, focused, and current (accent underline).
- `Kicker` — the uppercase meta labels (`Issue 212`, `Bengaluru`, the date); view it with tabular numerals.

**Step 2 — assemble the header (`Masthead`).**
Compose those three atoms into the masthead exactly per `BUILD_PLAN.md` §Navigation → masthead:
top meta row (3 Kickers, `space-between`), centered Wordmark 62px, tagline, hairline, centered row of 6 NavItems.
View `Masthead` in `/styleguide` on its own.

**Step 3 — the header in place.**
Drop `Masthead` into `layout.tsx` so it appears above every page. Now navigate the site: the correct
NavItem highlights via `aria-current`. The header is done, and you understood every layer of it.

The same three steps apply to **every** organism: pieces → assemble → place.

---

## Worked example: "how to show all the tools" (SEO-friendly)

The tools are the highest-traffic pages, so they must be both **shown well** and **found well**.

**Showing them (`ToolDirectory`, `/tools`):**
1. Keep the eight tools in one typed array `TOOLS` (id, num, name, short, desc) — copied verbatim from the prototype (in `BUILD_PLAN.md`). One source of truth.
2. `map` over `TOOLS` to render the plate rows (two-digit tabular number + heading-font name + one-line desc). Each row links to `/tools/[id]`.
3. The `SearchInput` filters the list client-side by name/desc.

**Making each tool findable (SEO + LLM SEO — see doc 5):**
1. **Its own real URL** — `/tools/json`, `/tools/regex`, … Real, shareable, indexable routes (not a single client-state screen). This is how they get found and cited.
2. **Static HTML shell** — the page is SSG: title, description, an intro paragraph ("what it does / it runs in your browser / nothing you paste leaves the page"), and the tool metadata are all in the server-rendered HTML, so search + AI crawlers read them. The interactive logic hydrates on top.
3. **Structured data** — each tool page emits `SoftwareApplication` (and, where it fits, `HowTo`) JSON-LD so it can show as a rich result and be understood by AI assistants.
4. **Unique metadata per tool** — generated from `TOOLS` so titles/descriptions don't collide.
5. **Internal links** — the directory links to each tool; each tool links back and to a couple of siblings; articles link to relevant tools. Good internal linking is read by both search and LLM crawlers.

So: **one data array → the directory, the eight pages, their metadata, and their structured data all derive from it.** Change a description once; everything updates.

---

## Conventions (so 100 components stay understandable)

- **One component per file**, named the same as the file. `PascalCase.tsx`.
- **Props are the only input.** No component reaches into global state except via a clearly-named context (rare).
- **Only tokens.** Never a raw hex, px, or font name the design system already carries. If you're tempted to add one, it belongs in `globals.css` as a token.
- **Client vs server:** default to server components; add `'use client'` only where there's interactivity (tools, forms, copy buttons, search).
- **Tool logic lives in `lib/tools/`,** separate from the React component, so it's pure and unit-testable (doc 4 §Testing). The component just calls it and renders.
- **Accessibility is part of "done,"** not a later pass: label, keyboard, focus ring, contrast, `aria-live` for status.
- **Every component earns its place in `/styleguide`** before a page uses it.
