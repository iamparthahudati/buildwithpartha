# 00 — Roadmap (First Release)

The build order, phase by phase. Every phase is a list of **small, checkable steps** and ends with a
**Review gate** — something concrete to verify before moving on. The philosophy is bottom-up: build the
smallest pieces first, understand each, then compose. Nothing is a black box.

> **Legend:** `[FE]` frontend (Next.js) · `[BE]` backend (Spring Boot) · `[ADM]` admin SPA ·
> `[INF]` infrastructure · `[SEC]` security · `[SEO]` search/AI discoverability · `[DOC]` documentation.

---

## Phase map (what order, and why)

```
0  Repository & tooling        ── the ground everything stands on
1  Design foundation           ── tokens, fonts, the visual language
2  Atomic UI components        ── buttons, tags, inputs … the alphabet
3  Layout shell                ── masthead + footer (first visible page)
4  The eight tools             ── the reason people come back (client-only)
5  Backend foundation          ── Spring Boot + Postgres + first endpoint
6  Public content pages        ── home, article, deals, stack, about, newsletter
7  Admin panel                 ── React SPA to manage all content
8  SEO + LLM SEO               ── metadata, sitemap, structured data, llms.txt
9  Security hardening + pentest── lock every door, then try to break in
10 Infra, deploy, launch       ── VPS, Docker, Caddy, Cloudflare, go live
```

Phases 1→4 give you a working, deployable **public site with the tools** before any backend exists —
the tools need no server. The backend (5) unlocks editable content (6) and the admin (7). SEO (8) and
security (9) are woven in as you go **and** get a dedicated hardening pass at the end. Deploy (10) last.

Each phase below is self-contained. Do not start a phase until the previous **Review gate** passes.

---

## Phase 0 — Repository & tooling `[INF][DOC]`

Goal: one clean repository holding all three apps, with formatting and safety rails in place.

- [ ] **0.1** Decide monorepo layout (see doc 1 §Repo layout). Create top-level folders: `web/` (Next.js), `api/` (Spring Boot), `admin/` (React SPA), `infra/` (Docker, Caddy), `docs/`.
- [ ] **0.2** Move the current Next.js app into `web/` (it currently lives at repo root). Keep git history.
- [ ] **0.3** Root `.gitignore` covering Node, Java (`target/`, `*.class`), env files, build output, `.DS_Store`.
- [ ] **0.4** `.editorconfig` (spaces, final newline) shared across all three apps.
- [ ] **0.5** Formatters/linters: Prettier + ESLint for `web/` and `admin/`; Spotless (Google Java Format) + Checkstyle for `api/`.
- [ ] **0.6** Secrets strategy: `.env.example` files committed, real `.env` git-ignored. Never commit a secret. (doc 4 §Secrets, doc 6 §Config)
- [ ] **0.7** Pre-commit hook (husky or a git hook) that runs format + lint + secret-scan (gitleaks) before every commit.
- [ ] **0.8** `README.md` at repo root: one-paragraph what-this-is + "run each app locally" commands + a pointer to `docs/`.

**Review gate:** `git clone` on a fresh machine, run each app's "hello" locally, commit a trivial change — the pre-commit hook runs and passes.

---

## Phase 1 — Design foundation `[FE]`

Goal: the Classical visual language is live in `web/`. (Mirrors `BUILD_PLAN.md` Stage 0.)

- [ ] **1.1** Port `design_handoff_buildwithpartha/design/_ds/classical-*/styles.css` — the `:root` tokens, the neutral/accent ramps, and the component classes — into `web/app/globals.css`. **Copy token values verbatim.** Remove the CSS `@import` fonts line.
- [ ] **1.2** Remove the old "coming soon" dark theme from `globals.css` and the Geist fonts from `layout.tsx`.
- [ ] **1.3** Load fonts via `next/font/google`: Cormorant Garamond (400, 600) → `--font-heading`; Lora (400, 500, italic) → `--font-body`. Mono = system stack.
- [ ] **1.4** Convert the type scale to **rem** (px ÷ 16) so text survives 200% zoom (doc 4/5 accessibility).
- [ ] **1.5** Global rules: `:focus-visible` accent ring, `::selection` accent tint, tabular numerals on figures only (not prose).
- [ ] **1.6** A `/styleguide` dev-only page rendering every token, ramp step, and design-system class, so you can eyeball the system in one place.

**Review gate:** `/styleguide` shows gold strokes, outlined buttons, bordered unfilled cards, plates — reads as Classical. Toggle browser zoom to 200%; nothing breaks.

---

## Phase 2 — Atomic UI components `[FE]`

Goal: the smallest reusable pieces, each built and viewed **in isolation** before it's used anywhere.
This is the "small small components" principle. See doc 2 for the full list and the exact build recipe per component.

Build in this order (each: build → view in `/styleguide` → check states → check a11y → done):

- [ ] **2.1** `Wordmark` (the "buildwithpartha" mark)
- [ ] **2.2** `Kicker` / eyebrow label
- [ ] **2.3** `Button` (primary/secondary/ghost/icon variants + states)
- [ ] **2.4** `Tag`
- [ ] **2.5** `TextInput` + `Field` (label + input, real `<label>`)
- [ ] **2.6** `SearchInput`
- [ ] **2.7** `Segmented` control (the tool option switcher)
- [ ] **2.8** `Card`
- [ ] **2.9** `Plate` (image mat wrapper)
- [ ] **2.10** `Hr` / hairline divider
- [ ] **2.11** `NavItem` (with `aria-current` + accent underline)
- [ ] **2.12** `AdSlot` placeholder (single abstraction; always labelled "Advertisement")
- [ ] **2.13** `CopyButton` (transient "Copied" state)
- [ ] **2.14** `StatusLine` (`aria-live="polite"` result reporter — used by every tool)

**Review gate:** every atom appears in `/styleguide` in all its states (hover, focus, pressed, disabled) and each is keyboard-reachable with the accent focus ring.

---

## Phase 3 — Layout shell `[FE]`

Goal: the first real, visible page — the frame every route sits inside. (Mirrors `BUILD_PLAN.md` Stage 1.)

- [ ] **3.1** `PageFrame` — flex column `nav → main → footer`, `min-height:100vh`, **desktop floor `min-width:1240px`**, full-width gutter `padding:0 clamp(20px,4vw,64px)`.
- [ ] **3.2** `Masthead` organism (compose from Wordmark + NavItem + Kicker): top meta row, centered wordmark 62px, tagline, hairline, centered nav (Home · Articles · Tools · Deals · Stack · About).
- [ ] **3.3** `Footer` organism: two tiers, exact copy from `BUILD_PLAN.md` §Footer.
- [ ] **3.4** Wire `Masthead` + `Footer` into `web/app/layout.tsx`; a placeholder home route renders inside the frame.
- [ ] **3.5** Active-route highlighting: the current nav item gets `aria-current="page"` + accent underline.

**Review gate:** navigate between placeholder routes; the correct nav item highlights; footer copy is exact; layout holds at 1240px.

---

## Phase 4 — The eight tools `[FE][SEC]` *(priority)*

Goal: `/tools` + `/tools/[tool]`, all eight working, **100% in the browser — nothing ever sent anywhere.**
Full behavior/status/error spec is in `BUILD_PLAN.md` §"The eight tools" — match it exactly.

- [ ] **4.1** Tool shell molecules: `Pane` (bordered surface + hairline header strip), `ToolRail` (switcher, active = accent left border), reuse `StatusLine` + `CopyButton`.
- [ ] **4.2** `/tools` directory (plates layout) — copy `TOOLS` metadata verbatim (in `BUILD_PLAN.md`).
- [ ] **4.3** `/tools/[tool]` workspace scaffold — one real URL per tool (linkable/shareable; that's how they get found).
- [ ] **4.4**–**4.11** Build each tool as its own client component **with a unit-test file**, in this order: `json`, `regex`, `base64`, `jwt`, `uuid`, `diff`, `contrast`, `hash`. Each reports via `StatusLine`; each error message matches the spec.
- [ ] **4.12** Verify **no network calls** on any tool (devtools Network tab stays empty on input). This is a product promise and a security property.
- [ ] **4.13** Per-tool SEO stub: unique `<title>`/meta + a one-paragraph "what this does / privacy" block (needed for doc 8; tools are top search-traffic pages).

**Review gate:** each tool matches the prototype including error text; Network tab is empty during use; every input has a real label; status lines announce to a screen reader.

---

## Phase 5 — Backend foundation `[BE][SEC]`

Goal: Spring Boot running against Postgres, with the first endpoint and security baseline. Full detail in doc 3.

- [ ] **5.1** Spring Boot 3 / Java 21 project in `api/` (Gradle). Starters: web, validation, data-jpa, security, actuator.
- [ ] **5.2** Postgres locally via Docker; connection config from env vars (never hard-coded).
- [ ] **5.3** Flyway for versioned DB migrations. First migration = empty baseline.
- [ ] **5.4** Health endpoint (`/api/health`) + Actuator locked to internal only.
- [ ] **5.5** Global error handling that returns safe JSON (never a stack trace to the client). (doc 4)
- [ ] **5.6** Security baseline: Spring Security on, everything denied by default, only explicitly-public routes opened. (doc 4)
- [ ] **5.7** Data model + migrations for: `article`, `deal`, `stack_item`, `subscriber`, `admin_user`, `ad_config`, `audit_log`. (doc 3 §Schema)
- [ ] **5.8** Public read API: `GET /api/articles`, `GET /api/articles/{slug}`, `GET /api/deals`, `GET /api/stack`. Read-only, cacheable, no auth.
- [ ] **5.9** `POST /api/newsletter/subscribe`: validate email, rate-limit, store as *pending*, trigger double-opt-in confirm (doc 3 §Newsletter). `GET /api/newsletter/confirm?token=…`.
- [ ] **5.10** Seed data: import the prototype's article/deals/stack as starting rows.

**Review gate:** hit every public endpoint with `curl`; a bad email is rejected with a safe error; subscribe creates a pending row and sends a confirm token; no stack traces leak.

---

## Phase 6 — Public content pages `[FE][SEO]`

Goal: the editorial pages, reading content from the API. (Mirrors `BUILD_PLAN.md` Stages 3–4.)

- [ ] **6.1** Data layer in `web/`: typed fetchers for articles/deals/stack; SSG at build + revalidate. (doc 1 §Rendering)
- [ ] **6.2** `/` home — magazine feed (lead story + secondary + sidebar: ad, newsletter capture, most-read, affiliate mini).
- [ ] **6.3** `/articles/[slug]` — article template: sticky contents rail + prose **capped ~34em**, hero plate, inline affiliate unit, pull quote, mid-article ad, end-of-article newsletter row. Content rendered from the API body (MDX or sanitized HTML — doc 3 §Article body).
- [ ] **6.4** `/deals` — always-on affiliate disclosure + 4 offer rows.
- [ ] **6.5** `/stack` — grouped items, affiliate links marked.
- [ ] **6.6** `/newsletter` — subscribe page wired to `POST /api/newsletter/subscribe`, real validation + success/error states.
- [ ] **6.7** `/about` — portrait plate + bio.
- [ ] **6.8** Per-page SEO wiring as you build each (doc 8 hooks): title, description, canonical, OpenGraph, article structured data.

**Review gate:** every page renders real content from the API; the newsletter form validates and shows success; disclosure appears on deals; view-source shows correct per-page metadata.

---

## Phase 7 — Admin panel `[ADM][SEC]`

Goal: a React SPA at `/admin` to manage all content, behind strong auth. Full detail in docs 3 + 4.

- [ ] **7.1** React SPA in `admin/` (Vite). Served at `/admin` behind Caddy — **same origin** as the site (no CORS).
- [ ] **7.2** Admin auth: login → server sets an **httpOnly, Secure, SameSite=Strict** session cookie (not localStorage). (doc 4 §Admin)
- [ ] **7.3** Route guard: unauthenticated → login; all admin API calls require the session + CSRF token.
- [ ] **7.4** Article CRUD: list, create, edit (with a body editor), publish/unpublish, delete (soft-delete + audit log).
- [ ] **7.5** Deals CRUD + the "removed if it got worse" workflow.
- [ ] **7.6** Stack CRUD.
- [ ] **7.7** Subscribers view: list, counts, export, unsubscribe handling. (Treat as personal data — doc 4 §Privacy.)
- [ ] **7.8** Ad config: pick density, paste network snippets (stored, output through the single `AdSlot`).
- [ ] **7.9** Audit log view: who changed what, when.
- [ ] **7.10** Admin-specific hardening: brute-force lockout, 2FA (TOTP), short session timeout, `noindex`. (doc 4)

**Review gate:** log in, create/edit/publish an article, see it live on the public site; log out invalidates the session; `/admin` is `noindex` and unreachable without auth; every change appears in the audit log.

---

## Phase 8 — SEO + LLM SEO `[SEO]`

Goal: findable by search engines **and** by AI chat assistants. Full detail in doc 5.

- [ ] **8.1** Global `<head>` defaults + per-page overrides (title templates, meta description, canonical).
- [ ] **8.2** OpenGraph + Twitter cards; per-article generated OG images.
- [ ] **8.3** `sitemap.xml` (generated from API content) + `robots.txt`.
- [ ] **8.4** Structured data (JSON-LD): `WebSite` + `Organization` sitewide; `Article` on posts; `SoftwareApplication`/`HowTo` on tools; `BreadcrumbList`; `FAQPage` where apt.
- [ ] **8.5** `RSS`/`Atom` feed of articles.
- [ ] **8.6** **LLM SEO:** `llms.txt` + `llms-full.txt`; clean, quotable, well-structured content; explicit facts and definitions; allow reputable AI crawlers in `robots.txt`; per-page machine-readable summaries. (doc 5 §LLM SEO)
- [ ] **8.7** Core Web Vitals pass: SSG + Cloudflare caching, font-display, image sizing, no layout shift.
- [ ] **8.8** Semantic HTML + full a11y sweep (doc 4/5): landmarks, headings order, alt text, labels, contrast.

**Review gate:** Lighthouse SEO + Best-Practices ≥ 95; rich-results test passes on an article and a tool; `sitemap.xml`, `robots.txt`, `llms.txt`, and RSS all resolve; a paste of an article into an AI chat is summarized accurately.

---

## Phase 9 — Security hardening & pentest `[SEC]`

Goal: methodically close every common hole, then try to break in. Full checklist in doc 4.

- [ ] **9.1** Security headers everywhere (Caddy + app): CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors. (doc 4 §Headers)
- [ ] **9.2** Input validation + output encoding audit across every endpoint and form (injection, XSS).
- [ ] **9.3** Rate limiting + bot protection on newsletter, login, and any write path (Caddy + app + Cloudflare).
- [ ] **9.4** Dependency & container scanning in CI (npm audit, OWASP Dependency-Check, Trivy) — fail the build on high severity.
- [ ] **9.5** Secrets audit: nothing in git, all via env/secret store; rotate anything ever exposed.
- [ ] **9.6** TLS everywhere, secure cookies, HSTS preload.
- [ ] **9.7** **Automated pentest pass:** run OWASP ZAP (baseline + active scan) against a staging deploy; run `nuclei`; fix findings.
- [ ] **9.8** **Manual pentest pass:** walk the OWASP Top 10 checklist (doc 4) by hand — auth, access control (try to reach `/admin` APIs unauthenticated / as another user), CSRF, IDOR, file handling.
- [ ] **9.9** Logging & monitoring for security events (failed logins, rate-limit hits) without logging secrets/PII.

**Review gate:** ZAP active scan shows no medium+ findings; you personally cannot reach any admin/write API without auth; `securityheaders.com` and `ssllabs.com` both grade A/A+.

---

## Phase 10 — Infrastructure, deploy & launch `[INF]`

Goal: everything live on the VPS, reproducible, backed up, monitored. Full detail in doc 6.

- [ ] **10.1** `docker-compose.prod.yml` for the full stack: `web`, `api`, `admin` (static), `postgres`, `caddy`.
- [ ] **10.2** Caddy config: path routing (`/`→web, `/api`→api, `/admin`→admin), automatic TLS, security headers, compression, caching.
- [ ] **10.3** Cloudflare in front: DNS, proxy on, cache rules, WAF/rate-rules, DDoS. Origin locked to Cloudflare IPs only.
- [ ] **10.4** Postgres backups: nightly dump, off-box copy, restore drill.
- [ ] **10.5** CI/CD: on push to main → build, test, scan, deploy to VPS. Zero-secret-in-logs.
- [ ] **10.6** Monitoring/uptime: health checks, error alerting, disk/CPU on the small VPS.
- [ ] **10.7** Staging environment (or a staging compose profile) to test before prod.
- [ ] **10.8** **Launch checklist** (doc 6 §Launch): DNS, TLS, sitemap submitted to Search Console + Bing, OG preview, 404/500 pages, backups verified, rollback plan.

**Review gate (first release ships):** site live on `buildwithpartha.tech` over HTTPS via Cloudflare; all pages + all 8 tools + newsletter + admin work in prod; backups run and a restore was tested; monitoring alerts fire on a forced failure.

---

## First-release "definition of done"

All ten review gates pass, **plus**:

- Public site: home, article, tools (×8), deals, stack, newsletter, about — all live, all styled Classical.
- Tools provably client-only (empty Network tab).
- Admin: full content CRUD behind hardened auth, `noindex`.
- SEO: Lighthouse ≥ 95, structured data valid, sitemap/robots/llms.txt/RSS live, submitted to search consoles.
- Security: ZAP clean of medium+, A/A+ on headers + TLS, dependency scans green in CI.
- Infra: Docker Compose on VPS behind Cloudflare, nightly backups tested, monitoring live.

## Explicitly **out** of first release (parked for later)

Ad-network integration (ship labelled placeholders via `AdSlot`), real photography, final long-form copy,
mobile-specific design pass, comments, search-across-articles, i18n, a second author. Note them; don't build them now.
