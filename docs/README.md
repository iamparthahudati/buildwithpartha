# buildwithpartha — Project Documentation

This folder is the single source of truth for building **buildwithpartha.tech**, first release.
Read it top to bottom the first time; after that, jump to the doc you need.

## The documents

| # | Document | What it covers |
| --- | --- | --- |
| — | [`00-ROADMAP.md`](00-ROADMAP.md) | **Start here.** The step-by-step build order, phase by phase, task by task, with review gates. |
| 1 | [`01-ARCHITECTURE.md`](01-ARCHITECTURE.md) | The whole system: repo layout, tech stack, how the pieces talk, environments, data flow. |
| 2 | [`02-COMPONENT-BUILD-ORDER.md`](02-COMPONENT-BUILD-ORDER.md) | The frontend built from the smallest pieces up — atom → molecule → page. Header first, then everything. |
| 3 | [`03-BACKEND-JAVA.md`](03-BACKEND-JAVA.md) | The Spring Boot backend: modules, database tables, every API endpoint, auth. |
| 4 | [`04-SECURITY.md`](04-SECURITY.md) | Making it hard to hack: OWASP Top 10, hardening checklist, admin lockdown, the pentest pass. |
| 5 | [`05-SEO.md`](05-SEO.md) | Traditional SEO **and** LLM / AI-chat SEO (so ChatGPT, Perplexity, Claude, Gemini find and cite the site). |
| 6 | [`06-INFRA-DEPLOY.md`](06-INFRA-DEPLOY.md) | The VPS, Docker Compose, Caddy, Cloudflare, TLS, backups, monitoring, CI/CD, launch checklist. |

There is also [`../BUILD_PLAN.md`](../BUILD_PLAN.md) — the earlier design-only plan for the public
site's look and the eight tools. It still holds; `00-ROADMAP.md` folds it into the bigger picture.

## Locked decisions (first release)

| Area | Decision |
| --- | --- |
| Public site | Next.js (App Router) / React / TypeScript — editorial site + 8 browser-only tools |
| Backend | **Java 21 + Spring Boot 3** REST API |
| Admin panel | **React SPA** at `/admin`, talks to the API |
| Database | **PostgreSQL 16** |
| Hosting | **One VPS**, everything in **Docker Compose**, **Caddy** reverse proxy, **Cloudflare** proxy in front |
| Design system | "Classical" — ported token sheet, Cormorant Garamond + Lora |
| Nav / feed / tools / ads | masthead · magazine · plates · balanced |

## How to read the roadmap

The roadmap is deliberately granular — small, checkable steps — because the point is that
**you understand every piece before moving on.** Each phase ends with a **Review gate**: a concrete
thing to look at or test before starting the next phase. Do not skip gates.

## Glossary (plain English)

- **Atom / molecule / organism** — a way of sizing UI components. An *atom* is the smallest piece (a button, a label); a *molecule* is a few atoms together (a search field = label + input); an *organism* is a whole section (the masthead nav). See doc 2.
- **SSG / SSR** — Static Site Generation (page built ahead of time, served as a file — fastest, best for SEO) vs Server-Side Rendering (page built per request). The public site is mostly SSG.
- **CMS** — Content Management System — here, the admin panel + API + database that let you edit articles/deals/stack without touching code.
- **GEO / LLM SEO** — Generative Engine Optimization: making the site easy for AI chat assistants to read, understand, and cite. See doc 5.
- **Reverse proxy** — one program (Caddy) that receives all web traffic and forwards each request to the right service (site, API, admin) behind it. See doc 6.
