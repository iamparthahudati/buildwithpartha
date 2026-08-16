# LifeOS

LifeOS is a private, account-based personal operating system for planning work, managing projects and tasks, time blocking, focus sessions, weekly planning, goals, notes, habits, and progress reporting.

Production URL: `https://buildwithpartha.tech/life-os`

This directory is the isolated LifeOS product area inside the existing `buildwithpartha` repository. The existing public website remains untouched.

## Delivery contract

- Frontend: React 19 + TypeScript + Vite, served at `/life-os/`.
- Backend: Java 21 + Spring Boot, exposed at `/life-os/api/v1/`.
- Database: PostgreSQL with Flyway migrations.
- Authentication: LifeOS-owned email/password accounts using secure server-side sessions.
- Runtime: Docker Compose on the owner's VPS, with Caddy as the origin reverse proxy and Cloudflare in front.
- Git: `master` is production, `develop` is integration, and every ticket uses a `feature/LOS-####-short-name` branch.
- Build order: foundations -> atomic components -> composed components -> feature flows -> full screens -> integrations -> release.

## Start here on every ticket

1. Read [AGENTS.md](./AGENTS.md).
2. Read [docs/01-PRODUCT-CONTEXT.md](./docs/01-PRODUCT-CONTEXT.md).
3. Read [docs/29-PRODUCT-VOCABULARY.md](./docs/29-PRODUCT-VOCABULARY.md) before naming UI, API, Java, TypeScript or database concepts.
4. Read [docs/30-CONTENT-AND-TONE-GUIDE.md](./docs/30-CONTENT-AND-TONE-GUIDE.md) before writing user-facing copy or fixtures.
5. Find the ticket in [docs/backlog/README.md](./docs/backlog/README.md).
6. Read any documents named in the ticket's `Context` field.
7. Create the feature branch from `develop` using the exact ticket ID.
8. Update [docs/CURRENT-STATUS.md](./docs/CURRENT-STATUS.md) and add a handoff note before stopping.

No implementation work should begin until the relevant ticket is marked `Ready` and all dependencies are complete.

## Documentation map

- [Project charter](./docs/00-PROJECT-CHARTER.md)
- [Permanent product context](./docs/01-PRODUCT-CONTEXT.md)
- [Architecture](./docs/02-ARCHITECTURE.md)
- [Design system](./docs/03-DESIGN-SYSTEM.md)
- [Domain model](./docs/04-DOMAIN-MODEL.md)
- [API conventions](./docs/05-API-CONVENTIONS.md)
- [Security baseline](./docs/06-SECURITY.md)
- [Git workflow](./docs/07-GIT-WORKFLOW.md)
- [Delivery phases](./docs/08-DELIVERY-PHASES.md)
- [Definition of done](./docs/09-DEFINITION-OF-DONE.md)
- [Decision log](./docs/10-DECISIONS.md)
- [Product vocabulary](./docs/29-PRODUCT-VOCABULARY.md)
- [Content and tone guide](./docs/30-CONTENT-AND-TONE-GUIDE.md)
- [Backlog index](./docs/backlog/README.md)
