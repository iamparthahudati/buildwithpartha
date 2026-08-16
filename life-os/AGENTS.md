# LifeOS working agreement

This file is the shared context for every LifeOS ticket. It is authoritative for all work inside `life-os/`.

## Product identity

- The product name is **LifeOS**. Never use “One System”, “SmartSpend”, or other names/data from the visual references in product copy, fixtures, package names, API paths, metadata, or assets.
- The visual references describe layout and interaction patterns only. They are not a source of product identity or production data.
- Production is `https://buildwithpartha.tech/life-os` on the owner's VPS behind Cloudflare.
- All application screens require a LifeOS account. Only authentication, legal, health, and static error routes may be public.

## Locked technical direction

- Frontend: React + TypeScript + Vite. Use feature folders and keep reusable primitives in `apps/web/src/components`.
- Backend: Java 21 + Spring Boot, package root `tech.buildwithpartha.lifeos`.
- Persistence: PostgreSQL; all schema changes use forward-only Flyway migrations.
- Same-origin production paths: UI `/life-os/*`; API `/life-os/api/v1/*`.
- Authentication: app-owned email/password with a server-side session cookie. Never put auth tokens in localStorage or sessionStorage.
- Deployment: Docker Compose on VPS; Caddy origin; Cloudflare proxy/DNS/WAF/TLS in front. Do not use ChatGPT or Sites hosting/authentication.
- Exact dependency versions are chosen and locked in the bootstrap ticket after checking current stable releases; do not silently upgrade them inside unrelated tickets.

## Component-first rule

Never build a full screen as a single component. Work in this order:

1. tokens and foundations;
2. atomic components;
3. composed components;
4. feature components with mocked data;
5. screen composition;
6. API integration;
7. end-to-end validation.

Each component must have its own file, explicit props, loading/empty/error/disabled states where applicable, accessibility behavior, and focused tests. A screen ticket may compose only components whose tickets are already complete.

## Required ticket workflow

- Branch from `develop`: `feature/LOS-####-short-kebab-name`.
- One ticket per branch and normally one ticket per pull request.
- Commit form: `type(scope): LOS-#### concise outcome`.
- Merge feature branches into `develop` only after the ticket definition of done passes.
- Merge `develop` into `master` only through a phase release ticket after the phase review gate passes.
- Production deployment is allowed only from `master` and must be tagged `life-os-vMAJOR.MINOR.PATCH`.
- Do not push directly to `master` or `develop`.

## Before editing

- Confirm the active ticket and its dependencies in `docs/backlog/`.
- Read `docs/CURRENT-STATUS.md` and the latest relevant file in `docs/handoffs/`.
- Check the current Git branch and uncommitted changes. Preserve unrelated user work.
- Record any necessary design/architecture deviation as an ADR before implementation.

## Completion and handoff

- Run the checks listed by the ticket plus the global definition of done.
- Update the ticket status, `docs/CURRENT-STATUS.md`, and any affected architecture/API/domain docs.
- Write `docs/handoffs/LOS-####.md` from the handoff template. Include completed behavior, changed files, validation, migrations/config changes, known limitations, and the next recommended ticket.
- Do not claim a ticket complete when tests are skipped, dependencies are unresolved, or acceptance criteria are unmet.

## Non-negotiable quality rules

- Every database query for user-owned data is scoped to the authenticated user.
- Authorization is enforced by the backend, never only by hidden frontend controls.
- All write requests are CSRF-protected and validated server-side.
- No secrets, real personal data, production credentials, or reference-image identities enter source control.
- Use UTC in storage and APIs; convert to the user's IANA timezone only at display/input boundaries.
- Meet WCAG 2.2 AA for keyboard access, focus, semantics, contrast, zoom, and reduced motion.
- Mobile, tablet, and desktop behavior are required even though the reference images are desktop-first.
- Destructive actions require confirmation and a recoverable strategy where practical.

