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

## Continuous integration

Every pull request to `develop` or `master` runs four required LifeOS checks: documentation/dependency integrity, frontend quality/build, backend quality/build, and full-history secret scanning. Actions are pinned to immutable commits, dependency caches are lockfile-scoped, and pull-request Gradle caches are read-only. `develop` and `master` require an up-to-date pull request with all four checks passing; direct/force pushes, deletion and unresolved review conversations are blocked.

Validate the workflow policy locally with `node life-os/scripts/validate-ci-workflow.mjs`. Repository owners can reproduce the protected-branch settings with `life-os/scripts/configure-branch-protection.sh` after authenticating `gh` for the intended repository.

## Engineering foundation gate

From a clean clone with Node/npm, Java 21 and native PostgreSQL command-line tools available, run:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./life-os/scripts/run-foundation-gate.sh
```

The gate installs the locked frontend tree, runs the complete frontend and uncached backend checks/builds, verifies Flyway against a disposable PostgreSQL cluster, then starts a disposable database, the production API JAR and the built web preview on isolated loopback ports. It requires API readiness and a nested `/life-os/app/today` SPA response, prints per-step timings and removes its database/process state on exit. The gate uses synthetic credentials/data only and does not touch the normal local Compose volume.

The accepted LOS-0216 evidence is in [the engineering foundation gate report](./docs/gates/ENGINEERING-FOUNDATION-GATE.md).

## Start here on every ticket

1. Read [AGENTS.md](./AGENTS.md).
2. Read [docs/01-PRODUCT-CONTEXT.md](./docs/01-PRODUCT-CONTEXT.md).
3. Read [docs/29-PRODUCT-VOCABULARY.md](./docs/29-PRODUCT-VOCABULARY.md) before naming UI, API, Java, TypeScript or database concepts.
4. Read [docs/30-CONTENT-AND-TONE-GUIDE.md](./docs/30-CONTENT-AND-TONE-GUIDE.md) before writing user-facing copy or fixtures.
5. Read [docs/31-PRIVACY-DATA-LIFECYCLE.md](./docs/31-PRIVACY-DATA-LIFECYCLE.md) before changing stored/transmitted data, providers, logs, browser storage, email, export, deletion, files, or AI.
6. Find the ticket in [docs/backlog/README.md](./docs/backlog/README.md).
7. Read any documents named in the ticket's `Context` field.
8. Create the feature branch from `develop` using the exact ticket ID.
9. Update [docs/CURRENT-STATUS.md](./docs/CURRENT-STATUS.md) and add a handoff note before stopping.

No implementation work should begin until the relevant ticket is marked `Ready` and all dependencies are complete.

## Documentation map

- [Project charter](./docs/00-PROJECT-CHARTER.md)
- [Permanent product context](./docs/01-PRODUCT-CONTEXT.md)
- [Architecture](./docs/02-ARCHITECTURE.md)
- [Dependency policy](./docs/DEPENDENCY-POLICY.md)
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
- [Privacy and data lifecycle](./docs/31-PRIVACY-DATA-LIFECYCLE.md)
- [Product and UX phase gate](./docs/gates/PRODUCT-UX-PHASE-GATE.md)
- [Engineering foundation gate](./docs/gates/ENGINEERING-FOUNDATION-GATE.md)
- [Backlog index](./docs/backlog/README.md)
