# 05 — SEO & LLM/AI SEO

Two audiences find this site: **search engines** (Google, Bing) and **AI assistants** (ChatGPT, Perplexity,
Claude, Gemini, and the AI answers inside search). This doc covers both. The good news: they want the same
things — fast, clean, well-structured, honestly-written pages — so most of the work serves both.

---

## Part A — Foundations that serve everyone

- **Server-rendered HTML.** Every public page is SSG/SSR (doc 1), so crawlers — search *and* AI — get the
  full content in the HTML without running JavaScript. The tool *pages* are static HTML shells even though
  the tool *logic* is client-side. This is the single most important SEO decision, and it's already made.
- **Fast.** SSG + Cloudflare cache + optimized fonts/images → strong **Core Web Vitals** (LCP/CLS/INP),
  which search ranks on and which keeps crawlers happy.
- **Semantic HTML.** One `<h1>` per page, ordered headings, `<article>`, `<nav>`, `<main>`, `<time>`, real
  `<a href>` links, descriptive `alt` text. Machines read structure; give them real structure.
- **Accessibility ≈ SEO.** Labels, alt text, heading order, contrast — the doc 4/2 a11y work directly helps
  both search and AI comprehension.

---

## Part B — Classic SEO checklist (Phase 8)

### Per-page metadata (via Next.js Metadata API)
- Unique **`<title>`** and **meta description** per page (tools generate theirs from the `TOOLS` array).
- **Canonical URL** on every page (avoid duplicate-content splits).
- **OpenGraph** + **Twitter Card** tags; a generated **OG image** per article and per tool.
- **`lang`**, sensible `<title>` template (`%s · buildwithpartha`).

### Site-level files (in `web/public/` or generated routes)
- **`sitemap.xml`** — generated from API content (all published articles, tools, deals, stack, static pages). Keep it current on publish.
- **`robots.txt`** — allow crawling of public content; disallow `/admin`; point to the sitemap and to `llms.txt`; explicitly allow reputable AI crawlers (Part C).
- **`rss.xml` / Atom feed** — of articles. Feeds are read by humans, aggregators, *and* AI ingestion pipelines.
- **`favicon`, web manifest** (already have a favicon).

### Structured data (JSON-LD) — critical for both search rich-results and AI understanding
- Sitewide: **`WebSite`** (+ `SearchAction` if you add site search later) and **`Organization`/`Person`** (you, the author).
- Articles: **`Article`/`BlogPosting`** — headline, author, datePublished, dateModified, image, wordCount.
- Tools: **`SoftwareApplication`** (browser-based, free) and, where the tool has steps, **`HowTo`**.
- Navigation: **`BreadcrumbList`**.
- Where a page answers common questions: **`FAQPage`**.
- Validate with Google's Rich Results Test + schema.org validator.

### Content & links
- **Internal linking:** directory → each tool → related tools; articles → relevant tools and other articles. Strong internal links help ranking and give AI crawlers a connected graph to follow.
- **URL design:** clean, stable, human-readable (`/tools/json`, `/articles/replacing-redis-with-unlogged-postgres`). Don't change published URLs; if you must, 301-redirect.
- **No thin/duplicate pages;** each tool page has genuine unique intro copy (what it does, the privacy promise, when to use it).

### Verify & submit
- **Google Search Console** + **Bing Webmaster Tools:** verify the domain, submit the sitemap, watch coverage/errors.
- **Lighthouse** SEO + Best-Practices ≥ 95 on representative pages.

---

## Part C — LLM / AI-chat SEO ("GEO": Generative Engine Optimization)

Goal: when someone asks an AI assistant a question this site answers ("a free browser JWT decoder", "how to
replace Redis with Postgres unlogged tables"), the assistant **can find, correctly understand, and cite**
buildwithpartha. You can't buy your way in; you earn it by being **the clearest, most trustworthy source**.

### 1. Be crawlable by AI — explicitly allow the good bots
In `robots.txt`, allow the reputable AI crawlers (and keep disallowing `/admin`). Examples of agents to
allow: `GPTBot` (OpenAI), `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`/`Claude-Web` (Anthropic),
`Google-Extended` (Gemini/AI Overviews), `Bingbot`/`Bing` (Copilot), `Applebot-Extended`, `CCBot` (Common
Crawl — feeds many models). Keep this list in one place and revisit it; agent names change.
> This is a *choice* to let AI use your content. You want that here (discovery + citations = traffic and authority).

### 2. `llms.txt` — a map of the site for language models
Add **`/llms.txt`** (and optionally **`/llms-full.txt`**) at the site root — an emerging convention that gives
LLMs a clean, Markdown index of your most important pages with one-line descriptions and links, so an
assistant can grab the signal without wading through HTML/nav/ads.
- `llms.txt` = a curated table of contents (site summary + links to the 8 tools, key articles, deals, stack, about), each with a short description.
- `llms-full.txt` (optional) = the actual clean Markdown content of the key pages concatenated, for direct ingestion.
- Generate both from the same API content so they stay current.

### 3. Structure content so a model can lift a clean answer
- **Answer-first writing:** put the direct answer/definition near the top; details below. Assistants quote the concise, self-contained statement.
- **Clear headings phrased as the questions people ask** ("What is a JWT?", "Is this JWT decoder safe?"). These map to how people prompt.
- **Explicit facts:** state specifics plainly — "This tool runs entirely in your browser; nothing you paste is uploaded." Models cite concrete, checkable claims.
- **Self-contained sections:** each section makes sense if lifted alone (AI often extracts a chunk, not the whole page).
- **Definitions, lists, tables, steps** — highly extractable formats. The tool `HowTo` structured data doubles as machine-readable steps.
- **FAQ blocks** with `FAQPage` schema — directly consumable Q&A.

### 4. Machine-readable summaries
- The `Article`/`SoftwareApplication` JSON-LD already gives AI a structured summary. Keep `description`/`abstract` fields accurate and specific.
- Consider a short, visible "In short" summary line at the top of each tool page and article — good for humans *and* the snippet an assistant will quote.

### 5. Earn trust (this is what actually gets you cited)
LLMs favor sources that are **specific, consistent, and corroborated**:
- **Author identity:** clear `Person`/`Organization` schema, an About page, consistent name ("buildwithpartha", Bengaluru) — models weight identifiable, accountable authors.
- **Accuracy & specificity:** the site's own voice (first person, real numbers, "no hype, willing to say what it doesn't know") is *exactly* what AI ranks as trustworthy. Lean into it.
- **Freshness:** `dateModified` maintained; the stack/deals pages' "updated when it changes, not when someone pays me" honesty is a citation asset.
- **Corroboration:** being referenced elsewhere (mentions, links) raises the odds of citation — normal off-site reputation still matters.

### 6. Don't sabotage it
- Don't hide content behind JS-only rendering (we don't — SSG).
- Don't stuff keywords or fabricate facts — AI cross-checks and demotes unreliable sources; the site's honesty policy is the right strategy.
- Don't block the AI crawlers you *want* citations from (double-check `robots.txt`).

---

## Part D — Per-surface cheat sheet

| Surface | Classic SEO | LLM SEO |
| --- | --- | --- |
| **Home** | `WebSite`+`Organization` JSON-LD, clean title/description, links to everything | Listed first in `llms.txt`; concise site summary |
| **Article** | `Article` JSON-LD, OG image, canonical, in sitemap + RSS | Answer-first, question-headings, `dateModified`, in `llms-full.txt` |
| **Tool page** | `SoftwareApplication`(+`HowTo`), unique intro copy, own URL | "In short" line + privacy fact stated plainly; FAQ block |
| **Deals** | honest reviewed content, disclosure | specific, checkable claims; freshness |
| **Stack** | list structure, updated dates | extractable list; "removed 2 items this year" honesty |
| **About** | `Person` schema, contact | author identity/trust signal |

---

## Part E — Verify (Phase 8 review gate)

- Lighthouse SEO + Best-Practices ≥ 95 on home, an article, and a tool.
- Rich Results Test passes on an `Article` and a tool `SoftwareApplication`.
- `sitemap.xml`, `robots.txt`, `llms.txt`, and `rss.xml` all resolve and are current.
- `robots.txt` allows the intended AI agents and disallows `/admin`.
- Sanity check: paste an article and a tool page's URL/content into ChatGPT/Claude/Perplexity and confirm each is summarized **accurately** and the key facts survive. If a fact gets mangled, the page wasn't explicit enough — fix the page.
- Submit the sitemap in Google Search Console + Bing Webmaster Tools.
