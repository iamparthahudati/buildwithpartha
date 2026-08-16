# 01 — Architecture

How the whole system fits together, and why each choice was made. Read this once so the rest of the docs
have a shape to hang on.

## The big picture

```
                          ┌─────────────────────────────┐
        visitors ───────► │        Cloudflare           │  DNS · CDN cache · TLS · WAF · DDoS
                          │        (proxy in front)     │
                          └──────────────┬──────────────┘
                                         │  (only Cloudflare IPs allowed to reach origin)
                          ┌──────────────▼──────────────┐
                          │      Caddy (reverse proxy)  │  one entry point on the VPS
                          │      automatic HTTPS         │
                          └───┬───────────┬──────────┬──┘
                path routing  │           │          │
              ┌───────────────┘     ┌─────┘          └──────────┐
              ▼                     ▼                           ▼
        /  (public site)     /api  (backend)             /admin (admin SPA)
     ┌──────────────┐    ┌──────────────────┐        ┌──────────────────┐
     │  Next.js     │    │  Spring Boot     │        │  React SPA        │
     │  (web)       │    │  (api, Java 21)  │        │  (admin, static)  │
     │  SSG + SSR   │    │  REST + Security │        │  talks to /api    │
     └──────────────┘    └────────┬─────────┘        └──────────────────┘
                                  │
                          ┌───────▼────────┐
                          │  PostgreSQL 16 │  content, subscribers, admin users, audit log
                          └────────────────┘

  All of the boxes on the VPS run as containers in one docker-compose.prod.yml.
```

### The one rule that shapes everything: the tools never touch the backend

The eight developer tools run **entirely in the browser**. No API call, ever. That is a product promise
*and* a security property (nothing to attack, nothing to leak). So the public site is useful and
deployable with **no backend at all** — the backend exists only for editable content, the newsletter,
and the admin panel.

## Why these choices

| Choice | Why |
| --- | --- |
| **Next.js** for the public site | App-Router file routing (you already have it), first-class SSG/SSR for SEO, `next/font`, image optimization. Tools ship as client components. |
| **Spring Boot** backend | Mature, huge ecosystem, **Spring Security** does the heavy lifting for the hardening you want, best long-term docs/hiring. |
| **React SPA** admin | You chose it: consistent with the public frontend, snappy editing UI. Served same-origin behind Caddy so there's **no CORS** and it can use a secure session cookie. |
| **PostgreSQL** | Natural fit with JPA/Spring, robust, transactional, easy nightly dumps. |
| **One VPS + Docker Compose** | One system to reason about and secure; reproducible; matches your existing `Dockerfile`/`docker-compose.prod.yml` and the "€3.79 server." |
| **Caddy** reverse proxy | Automatic TLS (Let's Encrypt) with near-zero config, simple path routing, easy security headers. |
| **Cloudflare in front** | Free CDN/edge cache (Core Web Vitals + SEO), DDoS protection, WAF, hides the origin IP. |

## Repo layout (monorepo)

One repository, three apps, shared infra + docs. Keeps everything versioned together and deployed as a set.

```
buildwithpartha/
├── web/                     Next.js — the public site + 8 tools
│   ├── app/                 App Router routes
│   │   ├── (site)/          home, articles, deals, stack, newsletter, about
│   │   ├── tools/           /tools and /tools/[tool]
│   │   ├── layout.tsx       masthead + footer shell
│   │   └── globals.css      ported Classical token sheet
│   ├── components/          atoms → molecules → organisms (see doc 2)
│   ├── lib/                 API fetchers, SEO helpers, tool logic + tests
│   └── public/              static assets, og images, robots.txt, llms.txt
│
├── api/                     Spring Boot — REST API + admin backend
│   ├── src/main/java/tech/buildwithpartha/
│   │   ├── article/  deal/  stack/  newsletter/  admin/  security/  common/
│   │   └── Application.java
│   ├── src/main/resources/
│   │   ├── db/migration/    Flyway SQL migrations
│   │   └── application.yml
│   └── build.gradle
│
├── admin/                   React SPA (Vite) — the /admin panel
│   ├── src/                 pages, api client, auth
│   └── vite.config.ts
│
├── infra/                   deployment
│   ├── docker-compose.prod.yml
│   ├── Caddyfile
│   └── deploy/              CI scripts, backup scripts
│
├── docs/                    ← you are here
└── design_handoff_buildwithpartha/   the design reference (do not port its runtime)
```

> The current app lives at the repo root; **Phase 0.2** moves it into `web/` (preserving git history).

## How the pieces talk

- **Browser → Cloudflare → Caddy.** Caddy is the only thing listening publicly on the VPS. It routes by path:
  - `/` and everything not below → **web** (Next.js)
  - `/api/*` → **api** (Spring Boot)
  - `/admin/*` → **admin** (static React build)
- **web → api:** at build time (SSG) and on revalidate, Next.js fetches content from `api` over the internal Docker network (`http://api:8080`), not the public URL. Fast, private.
- **admin → api:** the browser calls `/api/*` on the **same origin** (`buildwithpartha.tech/api/...`). Same-origin ⇒ the session cookie flows automatically and there is **no CORS to configure or weaken**.
- **api → Postgres:** over the internal Docker network only; Postgres is **never** exposed publicly.

## Rendering strategy (public site)

| Page | Strategy | Why |
| --- | --- | --- |
| Home, Deals, Stack, About | **SSG** with periodic revalidation | Content changes rarely; static = fastest + best SEO. |
| Article `/articles/[slug]` | **SSG** per slug, revalidate on publish | Best Core Web Vitals; AI/search crawlers get full HTML. |
| Tools `/tools/[tool]` | **SSG** shell + **client** logic | Page HTML is static (SEO); the tool itself is client-only (privacy promise). |
| Newsletter | SSG shell + client form | Form posts to the API. |

"Revalidate on publish": when you publish in admin, the API can ping a Next.js revalidation hook so the
static page rebuilds. (First release can also just use a short time-based revalidate — simpler.)

## Data flow examples

**Reading an article (visitor):**
`browser → Cloudflare (cache hit? serve) → Caddy → web (pre-rendered HTML) → done.`
No backend hit on a cache/SSG hit. Fast and cheap.

**Publishing an article (you):**
`admin SPA → POST /api/admin/articles (session cookie + CSRF) → Spring validates + saves to Postgres → writes audit_log → triggers web revalidation → new static page live.`

**Subscribing to the newsletter (visitor):**
`newsletter form → POST /api/newsletter/subscribe → Spring validates + rate-limits → store pending → email a confirm link → visitor clicks → GET /api/newsletter/confirm?token → status active.`

## Environments

| Env | Where | Purpose |
| --- | --- | --- |
| **local** | your machine | develop each app; Postgres in Docker |
| **staging** | VPS (compose profile or subdomain) | test a release, run the pentest scan, preview |
| **production** | VPS | the live site behind Cloudflare |

Config differs only by environment variables — never by code branches. (doc 6 §Config)

## Technology versions (pin these)

- Node LTS (≥ 22), Next.js (current), React 19, TypeScript 5
- Java 21 (LTS), Spring Boot 3.x, Gradle
- PostgreSQL 16
- Caddy 2
- Docker + Docker Compose v2

Pin exact versions in each app's manifest and in the Docker images; upgrade deliberately, not incidentally.

## What this architecture deliberately avoids (first release)

- **No Kubernetes / no cloud-managed services** — one VPS + Compose is enough and far easier to secure and understand.
- **No microservices** — one backend service. Split later only if a real need appears.
- **No client-side secret handling** — the browser never holds an API secret; tools need none; admin uses a server-set httpOnly cookie.
- **No third-party auth provider for admin (first release)** — a single hardened local admin account with 2FA. Add an IdP later if more editors join.
